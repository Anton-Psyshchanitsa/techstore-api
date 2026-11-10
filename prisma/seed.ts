import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedCategory {
  name: string;
  code: string;
  icon: string;
  image: string;
}

interface SeedProduct {
  title: string;
  slug: string;
  price: string;
  discountPrice: string | null;
  discount: number;
  categoryCode: string;
  rating: number;
  reviews: number;
  description: string;
  images: string[];
  stockQuantity: number;
  isDeal: boolean;
  features: string[];
  specifications: string[];
}

const categoriesData: SeedCategory[] = [
  {
    name: 'Audio',
    code: 'AUDIO',
    icon: 'headphones',
    image:
      'https://images.unsplash.com/photo-1760708368699-69cb9ed56f52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    name: 'Computers',
    code: 'COMPUTERS',
    icon: 'laptop',
    image:
      'https://images.unsplash.com/photo-1673431738089-c4fc9c2e96a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    name: 'Wearables',
    code: 'WEARABLES',
    icon: 'watch',
    image:
      'https://images.unsplash.com/photo-1665860455418-017fa50d29bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    name: 'Photography',
    code: 'PHOTOGRAPHY',
    icon: 'camera',
    image:
      'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
  {
    name: 'Tablets',
    code: 'TABLETS',
    icon: 'tablet',
    image:
      'https://images.unsplash.com/photo-1740637977676-c8040b41dc7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  },
];

const productsData: SeedProduct[] = [
  {
    title: 'Portable Bluetooth Speaker',
    slug: 'portable-bluetooth-speaker',
    price: '129.99',
    discountPrice: null,
    discount: 0,
    categoryCode: 'AUDIO',
    rating: 3.5,
    reviews: 327,
    description:
      'Take your music anywhere with this powerful portable speaker. Delivers rich, immersive sound with deep bass. Waterproof design perfect for outdoor adventures and pool parties.',
    images: [
      'https://images.unsplash.com/photo-1674303324806-7018a739ed11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1674303324806-7018a739ed11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1674303324806-7018a739ed11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    stockQuantity: 10,
    isDeal: false,
    features: ['Output Power: 20W', 'Battery Life: 15 hours', 'Water Rating: IPX7'],
    specifications: [
      'Output Power: 20W',
      'Battery Life: 15 hours',
      'Water Rating: IPX7',
      'Bluetooth: 5.2',
      'Range: 30 meters',
      'Charging: USB-C',
    ],
  },
  {
    title: 'Premium Wireless Headphones',
    slug: 'premium-wireless-headphones',
    price: '299.99',
    discountPrice: '239.99',
    discount: 20,
    categoryCode: 'AUDIO',
    rating: 5,
    reviews: 128,
    description:
      'Experience immersive audio with our premium wireless headphones. Featuring advanced noise cancellation, 40-hour battery life, and studio-quality sound. Perfect for music enthusiasts and professionals who demand the best audio experience.',
    images: [
      'https://images.unsplash.com/photo-1760708368699-69cb9ed56f52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1760708368699-69cb9ed56f52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1760708368699-69cb9ed56f52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    stockQuantity: 10,
    isDeal: true,
    features: [
      'Battery Life: 40 hours',
      'Connectivity: Bluetooth 5.3',
      'Noise Cancellation: Active ANC',
    ],
    specifications: [
      'Battery Life: 40 hours',
      'Connectivity: Bluetooth 5.3',
      'Noise Cancellation: Active ANC',
      'Driver Size: 40mm',
      'Weight: 250g',
      'Charging Time: 2 hours',
    ],
  },
  {
    title: 'Professional DSLR Camera',
    slug: 'professional-dslr-camera',
    price: '2499.99',
    discountPrice: '1999.99',
    discount: 20,
    categoryCode: 'PHOTOGRAPHY',
    rating: 5,
    reviews: 67,
    description:
      'Capture stunning images with this professional-grade DSLR camera. Features a full-frame sensor, 4K video recording, and exceptional low-light performance. Perfect for serious photographers and videographers.',
    images: [
      'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    stockQuantity: 10,
    isDeal: true,
    features: ['Sensor: 45MP Full-Frame', 'Video: 4K 60fps', 'ISO Range: 100-51200'],
    specifications: [
      'Sensor: 45MP Full-Frame',
      'Video: 4K 60fps',
      'ISO Range: 100-51200',
      'Autofocus Points: 693',
      'Burst Speed: 10 fps',
      'Display: 3.2\\" Tilting Touchscreen',
    ],
  },
  {
    title: 'Professional Laptop Pro',
    slug: 'professional-laptop-pro',
    price: '1899.99',
    discountPrice: '1519.99',
    discount: 20,
    categoryCode: 'COMPUTERS',
    rating: 4.5,
    reviews: 89,
    description:
      'Powerful performance meets sleek design in this professional laptop. Equipped with the latest processor, stunning display, and all-day battery life. Ideal for creative professionals and power users.',
    images: [
      'https://images.unsplash.com/photo-1673431738089-c4fc9c2e96a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1673431738089-c4fc9c2e96a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1673431738089-c4fc9c2e96a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    stockQuantity: 10,
    isDeal: true,
    features: ['Processor: Intel Core i9', 'RAM: 32GB DDR5', 'Storage: 1TB SSD'],
    specifications: [
      'Processor: Intel Core i9',
      'RAM: 32GB DDR5',
      'Storage: 1TB SSD',
      'Display: 15.6\\" 4K OLED',
      'Graphics: NVIDIA RTX 4060',
      'Battery: 12 hours',
    ],
  },
  {
    title: 'Smart Fitness Watch Ultra',
    slug: 'smart-fitness-watch-ultra',
    price: '449.99',
    discountPrice: '359.99',
    discount: 20,
    categoryCode: 'WEARABLES',
    rating: 4,
    reviews: 234,
    description:
      'Track your fitness goals with precision and style. Features advanced health monitoring, GPS tracking, and a vibrant always-on display. Water-resistant and built for active lifestyles.',
    images: [
      'https://images.unsplash.com/photo-1665860455418-017fa50d29bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1665860455418-017fa50d29bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1665860455418-017fa50d29bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    stockQuantity: 10,
    isDeal: true,
    features: ['Display: 1.9\\" AMOLED', 'Battery Life: 7 days', 'Water Resistance: 50m'],
    specifications: [
      'Display: 1.9\\" AMOLED',
      'Battery Life: 7 days',
      'Water Resistance: 50m',
      'GPS: Built-in',
      'Health Sensors: Heart Rate, SpO2, ECG',
      'Compatibility: iOS & Android',
    ],
  },
  {
    title: 'Ultra-Thin Tablet Pro',
    slug: 'ultra-thin-tablet-pro',
    price: '799.99',
    discountPrice: null,
    discount: 0,
    categoryCode: 'TABLETS',
    rating: 4.5,
    reviews: 123,
    description:
      'Experience productivity and entertainment on a stunning display. This ultra-thin tablet features powerful performance, all-day battery, and support for stylus input. Perfect for work and play.',
    images: [
      'https://images.unsplash.com/photo-1740637977676-c8040b41dc7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1740637977676-c8040b41dc7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1740637977676-c8040b41dc7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    stockQuantity: 10,
    isDeal: false,
    features: ['Display: 12.9\\" Liquid Retina', 'Processor: M2 Chip', 'Storage: 256GB'],
    specifications: [
      'Display: 12.9\\" Liquid Retina',
      'Processor: M2 Chip',
      'Storage: 256GB',
      'RAM: 8GB',
      'Battery: 10 hours',
      'Stylus Support: Yes',
    ],
  },
];

async function main(): Promise<void> {
  const categoryMap = new Map<string, number>();

  for (const category of categoriesData) {
    const saved = await prisma.category.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        icon: category.icon,
        image: category.image,
      },
      create: category,
    });
    categoryMap.set(saved.code, saved.id);
  }

  for (const item of productsData) {
    const categoryId = categoryMap.get(item.categoryCode);
    if (!categoryId) {
      throw new Error(`Category ${item.categoryCode} not found`);
    }

    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        description: item.description,
        price: item.price,
        discountPrice: item.discountPrice,
        discount: item.discount,
        rating: item.rating,
        reviews: item.reviews,
        stockQuantity: item.stockQuantity,
        isDeal: item.isDeal,
        features: item.features,
        specifications: item.specifications,
        categoryId,
        deletedAt: null,
      },
      create: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        price: item.price,
        discountPrice: item.discountPrice,
        discount: item.discount,
        rating: item.rating,
        reviews: item.reviews,
        stockQuantity: item.stockQuantity,
        isDeal: item.isDeal,
        features: item.features,
        specifications: item.specifications,
        categoryId,
      },
    });

    await prisma.productImage.deleteMany({
      where: { productId: product.id },
    });

    await prisma.productImage.createMany({
      data: item.images.map((url, index) => ({
        productId: product.id,
        url,
        position: index,
      })),
    });
  }

  await prisma.promoCode.upsert({
    where: { code: 'SAVE10' },
    update: {
      discountPercentage: 10,
      isActive: true,
    },
    create: {
      code: 'SAVE10',
      discountPercentage: 10,
      isActive: true,
    },
  });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@techstore.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'AdminPassword123!';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.admin,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: Role.admin,
    },
  });

  const customerEmail = process.env.SEED_CUSTOMER_EMAIL ?? 'customer@techstore.local';
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? 'CustomerPassword123!';
  const customerPasswordHash = await bcrypt.hash(customerPassword, 10);

  await prisma.user.upsert({
    where: { email: customerEmail },
    update: {
      passwordHash: customerPasswordHash,
      role: Role.customer,
    },
    create: {
      email: customerEmail,
      passwordHash: customerPasswordHash,
      role: Role.customer,
    },
  });

  console.log('Database seeded successfully: 5 categories, 6 products, SAVE10 promo, 2 users');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
