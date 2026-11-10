import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';

export const categoriesRouter: Router = Router();

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: {
          products: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  const items = categories.map((category) => ({
    id: category.id,
    name: category.name,
    code: category.code,
    icon: category.icon,
    productCount: category._count.products,
    image: category.image,
  }));

  res.status(200).json({ items });
});
