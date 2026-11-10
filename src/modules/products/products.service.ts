import type { Prisma } from '@prisma/client';
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

export const createProduct = async (input: CreateProductInput): Promise<ProductDto> => {
  const category = await prisma.category.findUnique({
    where: { code: input.categoryCode },
  });

  if (!category) {
    throw badRequest(`Category with code '${input.categoryCode}' does not exist`);
  }

  const baseSlug = input.slug ?? slugify(input.title);
  const slug = await buildUniqueSlug(baseSlug);
  const discountPrice = resolveDiscountPrice(
    input.price,
    input.discount,
    input.discountPrice,
  );
  const isDeal = input.isDeal ?? input.discount > 0;

  const product = await prisma.product.create({
    data: {
      title: input.title,
      slug,
      description: input.description,
      price: input.price.toFixed(2),
      discount: input.discount,
      discountPrice: discountPrice !== null ? discountPrice.toFixed(2) : null,
      rating: input.rating,
      reviews: input.reviews,
      stockQuantity: input.stock_quantity,
      isDeal,
      features: input.features,
      specifications: input.specifications,
      categoryId: category.id,
      images: {
        create: input.images.map((url, index) => ({
          url,
          position: index,
        })),
      },
    },
    include: productInclude,
  });

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
  if (input.categoryCode !== undefined) {
    const category = await prisma.category.findUnique({
      where: { code: input.categoryCode },
    });

    if (!category) {
      throw badRequest(`Category with code '${input.categoryCode}' does not exist`);
    }
    categoryId = category.id;
  }

  const nextPrice = input.price ?? Number(existing.price);
  const nextDiscount = input.discount ?? existing.discount;

  let nextDiscountPrice: string | null | undefined;
  if (input.discountPrice !== undefined) {
    nextDiscountPrice =
      input.discountPrice !== null ? input.discountPrice.toFixed(2) : null;
  } else if (input.price !== undefined || input.discount !== undefined) {
    const computed = resolveDiscountPrice(nextPrice, nextDiscount, undefined);
    nextDiscountPrice = computed !== null ? computed.toFixed(2) : null;
  }

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
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.price !== undefined ? { price: input.price.toFixed(2) } : {}),
        ...(input.discount !== undefined ? { discount: input.discount } : {}),
        ...(nextDiscountPrice !== undefined ? { discountPrice: nextDiscountPrice } : {}),
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.reviews !== undefined ? { reviews: input.reviews } : {}),
        ...(input.stock_quantity !== undefined
          ? { stockQuantity: input.stock_quantity }
          : {}),
        ...(input.isDeal !== undefined ? { isDeal: input.isDeal } : {}),
        ...(input.features !== undefined ? { features: input.features } : {}),
        ...(input.specifications !== undefined
          ? { specifications: input.specifications }
          : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      include: productInclude,
    });
  });

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
};
