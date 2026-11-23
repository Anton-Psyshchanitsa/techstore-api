import type { Prisma } from '@prisma/client';
import {
  buildCatalogCacheKey,
  cacheGet,
  cacheSet,
  invalidateCatalogCache,
} from '../../lib/cache.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from './products.schemas.js';

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
  category_id?: number;
  categoryId?: number;
  rating: number;
  reviews: number;
  images: string[];
  stock_quantity: number;
  stockQuantity: number;
  inStock: boolean;
  isDeal: boolean;
  features: string[];
  specifications: unknown;
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

export interface CachedProductsResult {
  data: PaginatedProductsResponse;
  cacheStatus: 'HIT' | 'MISS';
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
    category_id: product.categoryId,
    categoryId: product.categoryId,
    rating: product.rating,
    reviews: product.reviews,
    images: product.images.map((image) => image.url),
    stock_quantity: product.stockQuantity,
    stockQuantity: product.stockQuantity,
    inStock: product.stockQuantity > 0,
    isDeal: product.isDeal,
    features: toStringArray(product.features),
    specifications: product.specifications,
    created_at: createdIso,
    createdAt: createdIso,
  };
};

const slugify = (text: string): string => {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : `product-${String(Date.now())}`;
};

const buildUniqueSlug = async (baseSlug: string): Promise<string> => {
  const existing = await prisma.product.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });

  if (!existing) {
    return baseSlug;
  }

  return `${baseSlug}-${String(Date.now())}`;
};

const resolveDiscountPrice = (
  price: number,
  discount: number,
  explicitDiscountPrice: number | null | undefined,
): number | null => {
  if (explicitDiscountPrice !== undefined) {
    return explicitDiscountPrice;
  }
  if (discount > 0) {
    return Number((price * (1 - discount / 100)).toFixed(2));
  }
  return null;
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

const resolveCategoryCode = (
  input: Pick<CreateProductInput | UpdateProductInput, 'categoryCode'> & {
    category?: string;
  },
): string | undefined => {
  return input.categoryCode ?? input.category;
};

export const listProducts = async (
  query: ListProductsQuery,
): Promise<CachedProductsResult> => {
  const cacheKey = await buildCatalogCacheKey(query);
  const cached = await cacheGet<PaginatedProductsResponse>(cacheKey);

  if (cached) {
    return {
      data: cached,
      cacheStatus: 'HIT',
    };
  }

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

  const response: PaginatedProductsResponse = {
    items: products.map(toProductDto),
    meta: {
      total_items: totalItems,
      total_pages: totalPages,
      current_page: query.page,
      limit: query.limit,
    },
  };

  await cacheSet(cacheKey, response);

  return {
    data: response,
    cacheStatus: 'MISS',
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

export const createProduct = async (input: CreateProductInput): Promise<ProductDto> => {
  let categoryId: number | undefined;

  const rawCatId = input.categoryId ?? input.category_id;
  if (rawCatId) {
    const category = await prisma.category.findUnique({
      where: { id: rawCatId },
    });
    if (category) {
      categoryId = category.id;
    }
  }

  if (!categoryId) {
    const code = resolveCategoryCode(input);
    if (code) {
      const category = await prisma.category.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (category) {
        categoryId = category.id;
      }
    }
  }

  if (!categoryId) {
    const defaultCategory = await prisma.category.findFirst();
    if (!defaultCategory) {
      throw badRequest('No category found in database');
    }
    categoryId = defaultCategory.id;
  }

  const title = input.title || input.name || '';
  const baseSlug = input.slug ?? slugify(title);
  const slug = await buildUniqueSlug(baseSlug);
  const explicitDiscountPrice = input.discountPrice ?? input.discount_price;
  const discountPrice = resolveDiscountPrice(
    input.price,
    input.discount,
    explicitDiscountPrice,
  );
  const isDeal = input.isDeal ?? input.is_deal ?? (input.discount > 0);
  const stockQuantity = input.stockQuantity ?? input.stock_quantity;

  const product = await prisma.product.create({
    data: {
      title,
      slug,
      description: input.description,
      price: input.price.toFixed(2),
      discount: input.discount,
      discountPrice: discountPrice !== null ? discountPrice.toFixed(2) : null,
      rating: input.rating,
      reviews: input.reviews,
      stockQuantity,
      isDeal,
      features: input.features,
      specifications: input.specifications as Prisma.InputJsonValue,
      categoryId,
      images: {
        create: input.images.map((url, index) => ({
          url,
          position: index,
        })),
      },
    },
    include: productInclude,
  });

  await invalidateCatalogCache();

  return toProductDto(product);
};

export const updateProduct = async (
  id: number,
  input: UpdateProductInput,
): Promise<ProductDto> => {
  const existing = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw notFound('Product not found');
  }

  let categoryId: number | undefined;
  const rawCatId = input.categoryId ?? input.category_id;
  if (rawCatId) {
    const category = await prisma.category.findUnique({
      where: { id: rawCatId },
    });
    if (category) {
      categoryId = category.id;
    }
  } else {
    const code = resolveCategoryCode(input);
    if (code !== undefined) {
      const category = await prisma.category.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (!category) {
        throw badRequest(`Category with code '${code}' does not exist`);
      }
      categoryId = category.id;
    }
  }

  const nextPrice = input.price ?? Number(existing.price);
  const nextDiscount = input.discount ?? existing.discount;
  const explicitDiscountPrice = input.discountPrice ?? input.discount_price;

  let nextDiscountPrice: string | null | undefined;
  if (explicitDiscountPrice !== undefined) {
    nextDiscountPrice =
      explicitDiscountPrice !== null ? explicitDiscountPrice.toFixed(2) : null;
  } else if (input.price !== undefined || input.discount !== undefined) {
    const computed = resolveDiscountPrice(nextPrice, nextDiscount, undefined);
    nextDiscountPrice = computed !== null ? computed.toFixed(2) : null;
  }

  const title = input.title ?? input.name;
  const stockQuantity = input.stock_quantity ?? input.stockQuantity;
  const isDeal = input.isDeal ?? input.is_deal;

  const updated = await prisma.$transaction(async (tx) => {
    if (input.images !== undefined) {
      await tx.productImage.deleteMany({
        where: { productId: id },
      });

      await tx.productImage.createMany({
        data: input.images.map((url, index) => ({
          productId: id,
          url,
          position: index,
        })),
      });
    }

    return tx.product.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.price !== undefined ? { price: input.price.toFixed(2) } : {}),
        ...(input.discount !== undefined ? { discount: input.discount } : {}),
        ...(nextDiscountPrice !== undefined ? { discountPrice: nextDiscountPrice } : {}),
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.reviews !== undefined ? { reviews: input.reviews } : {}),
        ...(stockQuantity !== undefined ? { stockQuantity } : {}),
        ...(isDeal !== undefined ? { isDeal } : {}),
        ...(input.features !== undefined ? { features: input.features } : {}),
        ...(input.specifications !== undefined
          ? { specifications: input.specifications as Prisma.InputJsonValue }
          : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      include: productInclude,
    });
  });

  await invalidateCatalogCache();

  return toProductDto(updated);
};

export const deleteProduct = async (id: number): Promise<void> => {
  const existing = await prisma.product.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw notFound('Product not found');
  }

  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: { productId: id },
    }),
    prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ]);

  await invalidateCatalogCache();
};
