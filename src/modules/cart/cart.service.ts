import type { Prisma } from '@prisma/client';
import { badRequest, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import {
  productInclude,
  toProductDto,
  type ProductDto,
} from '../products/products.service.js';
import type {
  AddCartItemInput,
  ApplyPromoInput,
  UpdateCartItemInput,
} from './cart.schemas.js';

const TAX_RATE = 0.08;
const MAX_ITEM_QUANTITY = 99;

const roundMoney = (amount: number): number => Number(amount.toFixed(2));

export interface CartItemDto {
  id: number;
  productId: number;
  product_id: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: ProductDto;
}

export interface AppliedPromoDto {
  code: string;
  discount_percentage: number;
  discountPercentage: number;
}

export interface CartSummaryDto {
  totalItems: number;
  subtotal: number;
  taxRate: number;
  tax: number;
  discountPercentage: number;
  discount: number;
  total: number;
}

export interface CartResponseDto {
  id: number;
  userId: number;
  items: CartItemDto[];
  promoCode: AppliedPromoDto | null;
  summary: CartSummaryDto;
}

const cartInclude = {
  promoCode: true,
  items: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      product: {
        include: productInclude,
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithRelations = Prisma.CartGetPayload<{
  include: typeof cartInclude;
}>;

const getOrCreateUserCart = async (userId: number): Promise<CartWithRelations> => {
  const existing = await prisma.cart.findUnique({
    where: { userId },
    include: cartInclude,
  });

  if (existing) {
    return existing;
  }

  return prisma.cart.create({
    data: { userId },
    include: cartInclude,
  });
};

const toCartResponseDto = (cart: CartWithRelations): CartResponseDto => {
  const activeItems = cart.items.filter(
    (item) => item.product.deletedAt === null,
  );

  const items: CartItemDto[] = activeItems.map((item) => {
    const productDto = toProductDto(item.product);
    const unitPrice = productDto.discountPrice ?? productDto.price;
    const lineTotal = roundMoney(unitPrice * item.quantity);

    return {
      id: item.id,
      productId: item.productId,
      product_id: item.productId,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      product: productDto,
    };
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const tax = roundMoney(subtotal * TAX_RATE);

  const activePromo =
    cart.promoCode && cart.promoCode.isActive && items.length > 0
      ? cart.promoCode
      : null;

  const discountPercentage = activePromo ? activePromo.discountPercentage : 0;
  const discount =
    discountPercentage > 0
      ? roundMoney((subtotal + tax) * (discountPercentage / 100))
      : 0;
  const total = roundMoney(subtotal + tax - discount);

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    promoCode: activePromo
      ? {
          code: activePromo.code,
          discount_percentage: activePromo.discountPercentage,
          discountPercentage: activePromo.discountPercentage,
        }
      : null,
    summary: {
      totalItems,
      subtotal,
      taxRate: TAX_RATE,
      tax,
      discountPercentage,
      discount,
      total,
    },
  };
};

export const getCart = async (userId: number): Promise<CartResponseDto> => {
  const cart = await getOrCreateUserCart(userId);
  return toCartResponseDto(cart);
};

export const addCartItem = async (
  userId: number,
  input: AddCartItemInput,
): Promise<CartResponseDto> => {
  const product = await prisma.product.findFirst({
    where: {
      id: input.productId,
      deletedAt: null,
    },
  });

  if (!product) {
    throw notFound('Product not found');
  }

  if (product.stockQuantity <= 0) {
    throw badRequest('Product is out of stock');
  }

  const cart = await getOrCreateUserCart(userId);

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: product.id,
      },
    },
  });

  const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;

  if (nextQuantity > MAX_ITEM_QUANTITY) {
    throw badRequest(`Cannot add more than ${String(MAX_ITEM_QUANTITY)} units of a single product`);
  }

  if (nextQuantity > product.stockQuantity) {
    throw badRequest(
      `Insufficient stock. Available quantity: ${String(product.stockQuantity)}`,
    );
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: nextQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: nextQuantity,
      },
    });
  }

  return getCart(userId);
};

export const updateCartItem = async (
  userId: number,
  itemOrProductId: number,
  input: UpdateCartItemInput,
): Promise<CartResponseDto> => {
  const cart = await getOrCreateUserCart(userId);

  const item = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      OR: [{ id: itemOrProductId }, { productId: itemOrProductId }],
    },
    include: {
      product: true,
    },
  });

  if (!item || item.product.deletedAt !== null) {
    throw notFound('Cart item not found');
  }

  if (input.quantity > item.product.stockQuantity) {
    throw badRequest(
      `Insufficient stock. Available quantity: ${String(item.product.stockQuantity)}`,
    );
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: input.quantity },
  });

  return getCart(userId);
};

export const removeCartItem = async (
  userId: number,
  itemOrProductId: number,
): Promise<CartResponseDto> => {
  const cart = await getOrCreateUserCart(userId);

  const item = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      OR: [{ id: itemOrProductId }, { productId: itemOrProductId }],
    },
  });

  if (!item) {
    throw notFound('Cart item not found');
  }

  await prisma.cartItem.delete({
    where: { id: item.id },
  });

  const remainingCount = await prisma.cartItem.count({
    where: { cartId: cart.id },
  });

  if (remainingCount === 0 && cart.promoCodeId !== null) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: null },
    });
  }

  return getCart(userId);
};

export const clearCart = async (userId: number): Promise<CartResponseDto> => {
  const cart = await getOrCreateUserCart(userId);

  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    }),
    prisma.cart.update({
      where: { id: cart.id },
      data: { promoCodeId: null },
    }),
  ]);

  return getCart(userId);
};

export const applyPromoCode = async (
  userId: number,
  input: ApplyPromoInput,
): Promise<CartResponseDto> => {
  const cart = await getOrCreateUserCart(userId);

  if (cart.items.length === 0) {
    throw badRequest('Cannot apply promo code to an empty cart');
  }

  const promo = await prisma.promoCode.findUnique({
    where: { code: input.code },
  });

  if (!promo || !promo.isActive || promo.code !== input.code) {
    throw badRequest('Invalid or inactive promo code');
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { promoCodeId: promo.id },
  });

  return getCart(userId);
};
