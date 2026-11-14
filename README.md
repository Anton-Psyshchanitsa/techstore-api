# TechStore REST API

Production-ready RESTful backend for the **TechStore** e-commerce platform, built with Node.js, TypeScript, Express 5, Prisma ORM (MySQL 8.0 / TiDB Cloud), Memcached, and Cloudinary.

## Live Deployment

- **Frontend (GitHub Pages):** [https://anton-psyshchanitsa.github.io/techstore/index.html](https://anton-psyshchanitsa.github.io/techstore/index.html)
- **Backend API (Render):** [https://techstore-api-qu0b.onrender.com/api/products](https://techstore-api-qu0b.onrender.com/api/products)
- **Health Check:** [https://techstore-api-qu0b.onrender.com/health](https://techstore-api-qu0b.onrender.com/health)
- **Swagger UI Documentation:** [https://techstore-api-qu0b.onrender.com/api/docs](https://techstore-api-qu0b.onrender.com/api/docs)
- **OpenAPI 3.0 Spec:** [https://techstore-api-qu0b.onrender.com/api/openapi.json](https://techstore-api-qu0b.onrender.com/api/openapi.json)

---

## Tech Stack

- **Runtime & Language:** Node.js 22 LTS, TypeScript (ES2023, strict mode)
- **Web Framework:** Express 5 (`helmet`, `cors`, structured `pino` logging, centralized error handling)
- **Database & ORM:** MySQL 8.0 (local Docker) / TiDB Cloud Serverless (production) with Prisma ORM v6
- **Caching:** Memcached 1.6 (raw TCP client with versioned cache keys and automatic invalidation)
- **Authentication & Authorization:** JWT (`jsonwebtoken`), `bcryptjs`, Role-Based Access Control (`customer`, `admin`)
- **Validation:** Zod v4 schemas for request bodies, query parameters, and environment variables
- **Media Storage:** Cloudinary + `multer` (in-memory multipart uploads)
- **Testing:** Vitest + Supertest integration test suite
- **Containerization:** Multi-stage `Dockerfile` (non-root `node` user) & `docker-compose.yml`

---

## Key Features

1. **SQL-Level Catalog Filtering, Search, Sorting & Pagination (`GET /api/products`):**
   - Full-text substring search across `title` and `description` (`search`).
   - Price range (`min_price`, `max_price`), minimum rating (`min_rating`), category (`category`), deals (`is_deal`), and stock availability (`in_stock`).
   - Sorting by `price`, `title`, `rating`, or `created_at` (`asc` / `desc`).
   - Paginated response with `items` and `meta` (`total_items`, `total_pages`, `current_page`, `limit`).
2. **Memcached Caching Layer:**
   - Caches `GET /api/products` responses for 90 seconds keyed by normalized query parameters.
   - Exposes `X-Cache: HIT` / `X-Cache: MISS` response headers.
   - Automatically invalidates catalog cache upon product creation (`POST`), update (`PATCH`), or soft deletion (`DELETE`).
3. **Authentication & RBAC:**
   - Stateless JWT authentication via `Authorization: Bearer <token>`.
   - `customer` role: manages personal server-side cart and applies promo codes.
   - `admin` role: creates, updates, and soft-deletes products, and uploads product images to Cloudinary.
4. **Server-Side Shopping Cart & Promo Codes:**
   - Persistent cart stored in MySQL (`carts` and `cart_items` tables) with real-time `stock_quantity` validation.
   - Supports promo code `SAVE10` (10% discount).
   - Server-calculated summary: `subtotal`, `tax` (8%), `discount` (10% of `subtotal + tax`), and `total`.

---

## Database Schema

- **`users`** — `id`, `email` (unique), `password_hash`, `role` (`customer` | `admin`), `created_at`
- **`categories`** — `id`, `name`, `code` (unique), `icon`, `image`
- **`products`** — `id`, `title`, `slug` (unique), `description`, `price`, `discount_price`, `discount`, `rating`, `reviews`, `stock_quantity`, `is_deal`, `features` (JSON), `specifications` (JSON), `category_id`, `created_at`, `deleted_at`
- **`product_images`** — `id`, `product_id`, `url`, `position` (minimum 3 images per product)
- **`promo_codes`** — `id`, `code` (unique), `discount_percentage`, `is_active`, `created_at`
- **`carts`** — `id`, `user_id` (unique), `promo_code_id`, `updated_at`
- **`cart_items`** — `id`, `cart_id`, `product_id`, `quantity`

---

## API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | API, MySQL, and Memcached health status |
| `GET` | `/api/docs` | Public | Interactive Swagger UI documentation |
| `POST` | `/api/auth/register` | Public | Register a new customer account & return JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT |
| `GET` | `/api/auth/me` | Authenticated | Get current authenticated user profile |
| `GET` | `/api/categories` | Public | List all categories with active product counts |
| `GET` | `/api/products` | Public | List products (pagination, search, filters, sorting, Memcached) |
| `GET` | `/api/products/:id` | Public | Get single product details by ID |
| `POST` | `/api/products` | Admin | Create a new product (min 3 image URLs) & invalidate cache |
| `PATCH` | `/api/products/:id` | Admin | Update product fields & invalidate cache |
| `DELETE` | `/api/products/:id` | Admin | Soft-delete product (`deleted_at`) & invalidate cache |
| `POST` | `/api/uploads/images` | Admin | Upload up to 10 images to Cloudinary (`multipart/form-data`) |
| `GET` | `/api/cart` | Authenticated | Get current user's cart items and calculated summary |
| `DELETE` | `/api/cart` | Authenticated | Clear all items from current user's cart |
| `POST` | `/api/cart/items` | Authenticated | Add product to cart or increment quantity (checks stock) |
| `PATCH` | `/api/cart/items/:id` | Authenticated | Update item quantity in cart (checks stock) |
| `DELETE` | `/api/cart/items/:id` | Authenticated | Remove item from cart |
| `POST` | `/api/cart/apply-promo` | Authenticated | Apply promo code (`SAVE10`) to current user's cart |

---

## Default Seed Accounts & Promo Code

| Role | Email | Password |
| :--- | :--- | :--- |
| **Customer** | `customer@techstore.local` | `CustomerPassword123!` |
| **Admin** | `admin@techstore.local` | `AdminPassword123!` |

- **Active Promo Code:** `SAVE10` (10% discount)

---

## Local Setup & Development

### 1. Clone & Configure Environment

```bash
git clone https://github.com/Anton-Psyshchanitsa/techstore-api.git
cd techstore-api
cp .env.example .env
