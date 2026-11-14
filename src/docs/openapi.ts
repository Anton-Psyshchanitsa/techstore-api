export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TechStore REST API',
    version: '1.0.0',
    description:
      'REST API интернет-магазина TechStore (Вариант 1: Express + MySQL + Prisma + Memcached + Cloudinary).',
  },
  servers: [
    {
      url: 'https://techstore-api-qu0b.onrender.com',
      description: 'Production Server (Render)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server',
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
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Проверка состояния сервера',
        responses: {
          '200': { description: 'Сервер работает' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Регистрация нового покупателя (Customer)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'newuser@techstore.local' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Пользователь зарегистрирован, возвращён JWT токен' },
          '400': { description: 'Ошибка валидации' },
          '409': { description: 'Email уже занят' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Авторизация пользователя и получение JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'customer@techstore.local' },
                  password: { type: 'string', example: 'CustomerPassword123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Успешный вход, возвращён JWT токен' },
          '401': { description: 'Неверный логин или пароль' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Профиль текущего пользователя',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Данные текущего пользователя' },
          '401': { description: 'Не авторизован' },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Список всех категорий с количеством товаров',
        responses: {
          '200': { description: 'Список категорий' },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Каталог товаров (поиск, фильтрация, сортировка, пагинация, кэш Memcached)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Поиск по названию или описанию' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Код категории (например, audio)' },
          { name: 'min_price', in: 'query', schema: { type: 'number' } },
          { name: 'max_price', in: 'query', schema: { type: 'number' } },
          { name: 'min_rating', in: 'query', schema: { type: 'number' } },
          { name: 'sort_by', in: 'query', schema: { type: 'string', enum: ['price', 'title', 'rating', 'created_at'] } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          '200': {
            description: 'Список товаров с метаданными пагинации и заголовком X-Cache (HIT / MISS)',
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Создание нового товара (только Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'price', 'category', 'images'],
                properties: {
                  title: { type: 'string', example: 'Wireless Pro Keyboard' },
                  description: { type: 'string', example: 'Mechanical wireless RGB keyboard' },
                  price: { type: 'number', example: 199 },
                  rating: { type: 'number', example: 4.8 },
                  stock_quantity: { type: 'integer', example: 15 },
                  category: { type: 'string', example: 'accessories' },
                  images: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                      'https://res.cloudinary.com/demo/image/upload/sample.jpg',
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Товар создан, кэш каталога сброшен' },
          '401': { description: 'Не авторизован' },
          '403': { description: 'Доступ запрещён (требуется роль admin)' },
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Получение товара по ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        responses: {
          '200': { description: 'Детальная информация о товаре' },
          '404': { description: 'Товар не найден' },
        },
      },
      patch: {
        tags: ['Products'],
        summary: 'Редактирование товара (только Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  price: { type: 'number' },
                  stock_quantity: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Товар обновлён, кэш каталога сброшен' },
          '403': { description: 'Доступ запрещён (требуется роль admin)' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Удаление товара — soft-delete + сброс кэша (только Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        responses: {
          '200': { description: 'Товар помечен удалённым, кэш каталога сброшен' },
          '403': { description: 'Доступ запрещён (требуется роль admin)' },
        },
      },
    },
    '/api/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Получить личную корзину пользователя',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Содержимое корзины и расчёт стоимости' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Очистить корзину',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Корзина очищена' },
        },
      },
    },
    '/api/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Добавить товар в корзину',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['product_id', 'quantity'],
                properties: {
                  product_id: { type: 'integer', example: 1 },
                  quantity: { type: 'integer', example: 1 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Товар добавлен в корзину' },
        },
      },
    },
    '/api/cart/items/{id}': {
      patch: {
        tags: ['Cart'],
        summary: 'Изменить количество товара в корзине',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quantity'],
                properties: {
                  quantity: { type: 'integer', example: 2 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Количество обновлено' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Удалить позицию из корзины',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        responses: {
          '200': { description: 'Позиция удалена из корзины' },
        },
      },
    },
    '/api/cart/apply-promo': {
      post: {
        tags: ['Cart'],
        summary: 'Применить промокод (SAVE10 — скидка 10%)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', example: 'SAVE10' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Промокод применён, итоговая сумма пересчитана со скидкой 10%' },
          '400': { description: 'Недействительный промокод' },
        },
      },
    },
  },
};

export function renderSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TechStore API — Swagger Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
</head>
<body style="margin:0;padding:0;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/api/docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>`;
}
