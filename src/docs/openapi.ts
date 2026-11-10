export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TechStore REST API',
    version: '1.0.0',
    description:
      'E-commerce REST API built with Express 5, Prisma ORM (MySQL 8 / TiDB), Memcached, JWT RBAC, and Cloudinary.',
  },
  servers: [
    {
      url: '/',
      description: 'Current API server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      AuthCredentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'customer@techstore.local' },
          password: { type: 'string', example: 'CustomerPassword123!' },
        },
      },
      ProductCreateInput: {
        type: 'object',
        required: ['title', 'description', 'price', 'images'],
        properties: {
          title: { type: 'string', example: 'Wireless Mechanical Keyboard' },
          description: {
            type: 'string',
            example: 'Hot-swappable RGB mechanical keyboard with aluminum frame.',
          },
          price: { type: 'number', example: 159.99 },
          discount: { type: 'integer', example: 10 },
          rating: { type: 'number', example: 4.7 },
          reviews: { type: 'integer', example: 54 },
          stock_quantity: { type: 'integer', example: 15 },
          categoryCode: { type: 'string', example: 'COMPUTERS' },
          images: {
            type: 'array',
            minItems: 3,
            items: { type: 'string', format: 'uri' },
            example: [
              'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1080',
              'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1080',
              'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1080',
            ],
          },
          features: {
            type: 'array',
            items: { type: 'string' },
            example: ['Switches: Tactile Brown', 'Battery: 200 hours'],
          },
          specifications: {
            type: 'array',
            items: { type: 'string' },
            example: ['Layout: 75%', 'Connectivity: Bluetooth 5.1 & 2.4GHz'],
          },
        },
      },
      CartAddItemInput: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'integer', example: 2 },
          quantity: { type: 'integer', minimum: 1, maximum: 99, example: 1 },
        },
      },
      CartUpdateItemInput: {
        type: 'object',
        required: ['quantity'],
        properties: {
          quantity: { type: 'integer', minimum: 1, maximum: 99, example: 2 },
        },
      },
      ApplyPromoInput: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', example: 'SAVE10' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Healthcheck for API, MySQL, and Memcached',
        responses: {
          '200': { description: 'Service is healthy' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new customer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthCredentials' },
            },
          },
        },
        responses: {
          '201': { description: 'Customer registered and JWT returned' },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user and issue JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthCredentials' },
            },
          },
        },
        responses: {
          '200': { description: 'JWT token and user profile' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current user profile' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List all categories with active product counts',
        responses: {
          '200': { description: 'Categories list' },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'List products with SQL filtering, search, sorting, pagination, and Memcached caching',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'min_price', in: 'query', schema: { type: 'number' } },
          { name: 'max_price', in: 'query', schema: { type: 'number' } },
          { name: 'min_rating', in: 'query', schema: { type: 'number' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'is_deal', in: 'query', schema: { type: 'boolean' } },
          { name: 'in_stock', in: 'query', schema: { type: 'boolean' } },
          {
            name: 'sort_by',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['price', 'title', 'rating', 'created_at'],
              default: 'created_at',
            },
          },
          {
            name: 'order',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated product list with meta and X-Cache header',
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a new product (Admin only, invalidates catalog cache)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductCreateInput' },
            },
          },
        },
        responses: {
          '201': { description: 'Product created' },
          '400': { description: 'Validation error (e.g., fewer than 3 images)' },
          '403': { description: 'Forbidden (Admin role required)' },
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get a single product by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Product details' },
          '404': { description: 'Product not found' },
        },
      },
      patch: {
        tags: ['Products'],
        summary: 'Update a product (Admin only, invalidates catalog cache)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductCreateInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Product updated' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Product not found' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Soft-delete a product (Admin only, invalidates catalog cache)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Product soft-deleted' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Product not found' },
        },
      },
    },
    '/api/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get current user cart with 8% tax and promo discount summary',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User cart and calculated totals' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Clear all items from current user cart',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Empty cart' },
        },
      },
    },
    '/api/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add product to cart (validates stock_quantity)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CartAddItemInput' },
            },
          },
        },
        responses: {
          '201': { description: 'Updated cart' },
          '400': { description: 'Insufficient stock or invalid quantity' },
        },
      },
    },
    '/api/cart/items/{id}': {
      patch: {
        tags: ['Cart'],
        summary: 'Update cart item quantity',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CartUpdateItemInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated cart' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove item from cart',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Updated cart' },
        },
      },
    },
    '/api/cart/apply-promo': {
      post: {
        tags: ['Cart'],
        summary: 'Validate and apply promo code SAVE10 (10% discount)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApplyPromoInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Promo applied and cart totals recalculated' },
          '400': { description: 'Invalid promo code or empty cart' },
        },
      },
    },
    '/api/uploads/images': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload product images to Cloudinary (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Uploaded image URLs' },
        },
      },
    },
  },
} as const;
