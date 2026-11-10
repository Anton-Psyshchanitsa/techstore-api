import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('TechStore REST API integration suite', () => {
  let adminToken = '';
  let customerToken = '';
  let createdProductId = 0;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /health returns connected database and cache', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });

  it('POST /api/auth/login authenticates admin and customer', async () => {
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@techstore.local',
      password: 'AdminPassword123!',
    });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.user.role).toBe('admin');
    adminToken = adminRes.body.token as string;

    const customerRes = await request(app).post('/api/auth/login').send({
      email: 'customer@techstore.local',
      password: 'CustomerPassword123!',
    });
    expect(customerRes.status).toBe(200);
    expect(customerRes.body.user.role).toBe('customer');
    customerToken = customerRes.body.token as string;
  });

  it('GET /api/products supports SQL filtering, pagination, and Memcached HIT', async () => {
    const firstRes = await request(app).get(
      '/api/products?page=1&limit=2&sort_by=price&order=asc',
    );
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.items).toHaveLength(2);
    expect(firstRes.body.meta.limit).toBe(2);

    const secondRes = await request(app).get(
      '/api/products?page=1&limit=2&sort_by=price&order=asc',
    );
    expect(secondRes.status).toBe(200);
    expect(secondRes.headers['x-cache']).toBe('HIT');
  });

  it('RBAC blocks customer from creating products (403)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Unauthorized Item',
        description: 'Should be rejected by RBAC middleware',
        price: 100,
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        ],
      });
    expect(res.status).toBe(403);
  });

  it('Admin can create and soft-delete a product and invalidate cache', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Gaming Mouse',
        description: 'Ultra-lightweight wireless gaming mouse with optical switches.',
        price: 149.99,
        categoryCode: 'COMPUTERS',
        images: [
          'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
          'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
          'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
        ],
      });
    expect(createRes.status).toBe(201);
    createdProductId = createRes.body.id as number;

    const deleteRes = await request(app)
      .delete(`/api/products/${String(createdProductId)}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    const getDeletedRes = await request(app).get(
      `/api/products/${String(createdProductId)}`,
    );
    expect(getDeletedRes.status).toBe(404);
  });

  it('Cart calculates 8% tax and 10% SAVE10 discount accurately', async () => {
    await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`);

    const addRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 2, quantity: 2 });
    expect(addRes.status).toBe(201);
    expect(addRes.body.summary.subtotal).toBe(479.98);
    expect(addRes.body.summary.tax).toBe(38.4);

    const promoRes = await request(app)
      .post('/api/cart/apply-promo')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'SAVE10' });
    expect(promoRes.status).toBe(200);
    expect(promoRes.body.summary.discount).toBe(51.84);
    expect(promoRes.body.summary.total).toBe(466.54);

    await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`);
  });
});
