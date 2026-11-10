import { z } from 'zod';
import { badRequest } from '../../lib/errors.js';

const optionalBooleanSchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));

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

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Product ID must be a positive integer'),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const parseProductId = (params: unknown): number => {
  const parsed = productIdParamSchema.safeParse(params);
  if (!parsed.success) {
    throw badRequest('Invalid product ID');
  }
  return parsed.data.id;
};
