import { z } from 'zod';
import { badRequest } from '../../lib/errors.js';

const quantitySchema = z.coerce
  .number()
  .int()
  .min(1, 'Quantity must be at least 1')
  .max(99, 'Quantity cannot exceed 99');

export const addCartItemSchema = z
  .object({
    productId: z.coerce.number().int().positive().optional(),
    product_id: z.coerce.number().int().positive().optional(),
    quantity: quantitySchema.default(1),
  })
  .transform((data, ctx) => {
    const resolvedId = data.productId ?? data.product_id;
    if (!resolvedId) {
      ctx.addIssue({
        code: 'custom',
        path: ['productId'],
        message: 'productId is required',
      });
      return z.NEVER;
    }

    return {
      productId: resolvedId,
      quantity: data.quantity,
    };
  });

export const updateCartItemSchema = z.object({
  quantity: quantitySchema,
});

export const applyPromoSchema = z.object({
  code: z.string().trim().min(1, 'Promo code is required').max(50),
});

const itemIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Item ID must be a positive integer'),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type ApplyPromoInput = z.infer<typeof applyPromoSchema>;

export const parseCartItemId = (params: unknown): number => {
  const parsed = itemIdParamSchema.safeParse(params);
  if (!parsed.success) {
    throw badRequest('Invalid cart item ID');
  }
  return parsed.data.id;
};
