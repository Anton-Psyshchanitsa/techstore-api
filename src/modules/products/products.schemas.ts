import { z } from 'zod';
import { badRequest } from '../../lib/errors.js';

const optionalBooleanSchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));

const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .pipe(z.url({ error: 'Each image must be a valid URL' }));

const imagesArraySchema = z
  .array(imageUrlSchema)
  .min(3, 'At least 3 image URLs are required for the product slider')
  .max(10);

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    search: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    min_price: z.coerce.number().min(0).optional(),
    max_price: z.coerce.number().min(0).optional(),
    min_rating: z.coerce.number().min(0).max(5).optional(),
    category: z
      .string()
      .trim()
      .toUpperCase()
      .max(50)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    is_deal: optionalBooleanSchema,
    in_stock: optionalBooleanSchema,
    sort_by: z.enum(['price', 'title', 'rating', 'created_at']).default('created_at'),
    order: z.enum(['asc', 'desc']).default('asc'),
  })
  .superRefine((data, ctx) => {
    if (
      data.min_price !== undefined &&
      data.max_price !== undefined &&
      data.min_price > data.max_price
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['min_price'],
        message: 'min_price cannot be greater than max_price',
      });
    }
  });

export const createProductSchema = z.object({
  title: z.string().trim().min(2).max(255),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
    .max(255)
    .optional(),
  description: z.string().trim().min(10).max(5000),
  price: z.coerce.number().positive('Price must be greater than 0').max(999999.99),
  discount: z.coerce.number().int().min(0).max(90).default(0),
  discountPrice: z.coerce.number().positive().max(999999.99).nullable().optional(),
  rating: z.coerce.number().min(0).max(5).default(0),
  reviews: z.coerce.number().int().min(0).default(0),
  stock_quantity: z.coerce.number().int().min(0).default(10),
  categoryCode: z.string().trim().toUpperCase().min(1).max(50).default('AUDIO'),
  isDeal: z.boolean().optional(),
  images: imagesArraySchema,
  features: z.array(z.string().trim().min(1).max(255)).default([]),
  specifications: z.array(z.string().trim().min(1).max(255)).default([]),
});

export const updateProductSchema = z
  .object({
    title: z.string().trim().min(2).max(255).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    price: z.coerce.number().positive('Price must be greater than 0').max(999999.99).optional(),
    discount: z.coerce.number().int().min(0).max(90).optional(),
    discountPrice: z.coerce.number().positive().max(999999.99).nullable().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    reviews: z.coerce.number().int().min(0).optional(),
    stock_quantity: z.coerce.number().int().min(0).optional(),
    categoryCode: z.string().trim().toUpperCase().min(1).max(50).optional(),
    isDeal: z.boolean().optional(),
    images: imagesArraySchema.optional(),
    features: z.array(z.string().trim().min(1).max(255)).optional(),
    specifications: z.array(z.string().trim().min(1).max(255)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Product ID must be a positive integer'),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const parseProductId = (params: unknown): number => {
  const parsed = productIdParamSchema.safeParse(params);
  if (!parsed.success) {
    throw badRequest('Invalid product ID');
  }
  return parsed.data.id;
};
