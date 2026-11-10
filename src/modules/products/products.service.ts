import type { Prisma } from '@prisma/client';
import { notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type { ListProductsQuery } from './products.schemas.js';

export interface ProductDto {
  id: number;
  title: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  discount: number;
  category: string;
  categoryCode: string;
  rating: number;
  reviews: number;
  images: string[];
  stock_quantity: number;
  stockQuantity: number;
  inStock: boolean;
  isDeal: boolean;
  features: string[];
  specifications: string[];
  created_at: string;
  createdAt: string;
}

export interface PaginatedProductsResponse {
  items: ProductDto[];
  meta: {
    total_items: number;
    total_pages: number;
    current_page: number;
    limit: number;
  };
}

export const productInclude = {
  category: true,
  images: {
    orderBy: {
      position: 'asc',
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

const toStringArray = (value: Prisma.JsonValue): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
};

export const toProductDto = (product: ProductWithRelations): ProductDto => {
  const createdIso = product.createdAt.toISOString();

  return {
    id: product.id,
    title: product.title,
    name: product.title,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    discountPrice:
      product.discountPrice !== null ? Number(product.discountPrice) : null,
    discount: product.discount,
    category: product.category.name,
    categoryCode: product.category.code,
    rating: product.rating,
    reviews: product.reviews,
    images: product.images.map((image) => image.url),
    stock_quantity: product.stockQuantity,
    stockQuantity: product.stockQuantity,
    inStock: product.stockQuantity > 0,
    isDeal: product.isDeal,
    features: toStringArray(product.features),
    specifications: toStringArray(product.specifications),
    created_at: createdIso,
    createdAt: createdIso,
  };
};

const buildOrderBy = (
  sortBy: ListProductsQuery['sort_by'],
  order: ListProductsQuery['order'],
): Prisma.ProductOrderByWithRelationInput => {
  switch (sortBy) {
    case 'price':
      return { price: order };
    case 'title':
      return { title: order };
    case 'rating':
      return { rating: order };
    case 'created_at':
      return { createdAt: order };
  }
};

export const listProducts = async (
  query: ListProductsQuery,
): Promise<PaginatedProductsResponse> => {
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
  };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }

  if (query.min_price !== undefined || query.max_price !== undefined) {
    where.price = {
      ...(query.min_price !== undefined ? { gte: query.min_price } : {}),
      ...(query.max_price !== undefined ? { lte: query.max_price } : {}),
    };
  }

  if (query.min_rating !== undefined) {
    where.rating = { gte: query.min_rating };
  }

  if (query.category) {
    where.category = { code: query.category };
  }

  if (query.is_deal !== undefined) {
    where.isDeal = query.is_deal;
  }

  if (query.in_stock !== undefined) {
    where.stockQuantity = query.in_stock ? { gt: 0 } : { equals: 0 };
  }

  const skip = (query.page - 1) * query.limit;
  const orderBy = buildOrderBy(query.sort_by, query.order);

  const [totalItems, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip,
      take: query.limit,
    }),
  ]);

  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit);

  return {
    items: products.map(toProductDto),
    meta: {
      total_items: totalItems,
      total_pages: totalPages,
      current_page: query.page,
      limit: query.limit,
    },
  };
};

export const getProductById = async (id: number): Promise<ProductDto> => {
  const product = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: productInclude,
  });

  if (!product) {
    throw notFound('Product not found');
  }

  return toProductDto(product);
};
