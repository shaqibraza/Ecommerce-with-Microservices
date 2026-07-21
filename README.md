# Trend E-Commerce Platform - With Microservice Architecture

A full-stack, event-driven e-commerce platform built as a **Turborepo monorepo**. It combines microservices for products, orders, payments, and authentication with two Next.js frontends — a customer storefront and an admin dashboard — connected through **Apache Kafka** for asynchronous messaging.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Services & Ports](#services--ports)
- [API Reference](#api-reference)
- [Kafka Events](#kafka-events)
- [Database Schemas](#database-schemas)
- [Frontend Applications](#frontend-applications)
- [Authentication & Authorization](#authentication--authorization)
- [Payment Flow](#payment-flow)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Development Scripts](#development-scripts)
- [Production Considerations](#production-considerations)

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Client (3002)  │     │  Admin  (3003)  │
│  Next.js Store  │     │  Next.js Dash   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │  REST + Clerk JWT     │
         ▼                       ▼
┌────────────────────────────────────────────────────────────┐
│                     Backend Microservices                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│
│  │ Product :8000│ │ Order  :8005 │ │ Payment      :8002 ││
│  │   Express    │ │   Fastify    │ │   Hono             ││
│  └──────┬───────┘ └──────┬───────┘ └──────────┬─────────┘│
│         │                │                     │           │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────────┴─────────┐│
│  │ Auth   :8003 │ │ Email Service│ │                    ││
│  │   Express    │ │ (Kafka only) │ │                    ││
│  └──────────────┘ └──────────────┘ └────────────────────┘│
└────────────────────────────┬───────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Apache Kafka   │
                    │  (3-broker KRaft│
                    │   cluster)      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        PostgreSQL       MongoDB      Razorpay API
      (Products/Cats)    (Orders)     (Payments)
```

**Request flow (checkout):**

1. Customer adds items to cart (client-side Zustand store).
2. Customer submits shipping details and initiates payment via Razorpay.
3. Payment service creates a Razorpay order and verifies the payment signature.
4. On success, payment service publishes a `payment.successful` Kafka event.
5. Order service consumes the event, persists the order to MongoDB, and publishes `order.created`.
6. Email service consumes `order.created` and sends a confirmation email.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | [Turborepo](https://turbo.build) + [pnpm workspaces](https://pnpm.io/workspaces) |
| Language | TypeScript 5.9 |
| Storefront | Next.js 15, React 19, Tailwind CSS 4, Zustand |
| Admin Dashboard | Next.js 15, React 19, shadcn/ui, TanStack Table/Query, Recharts |
| Authentication | [Clerk](https://clerk.com) (JWT + session claims) |
| Product Service | Express 5 + Prisma + PostgreSQL |
| Order Service | Fastify 5 + Mongoose + MongoDB |
| Payment Service | Hono 4 + Razorpay SDK |
| Auth Service | Express 5 + Clerk Backend API |
| Email Service | Nodemailer (Gmail OAuth2) |
| Messaging | KafkaJS + Apache Kafka (KRaft, 3 brokers) |
| Image Uploads | Cloudinary (admin product images) |
| Validation | Zod (shared schemas in `@repo/types`) |

---

## Repository Structure

```
ecommerce/
├── apps/
│   ├── admin/                  # Admin dashboard (Next.js, port 3003)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/           # Sign-in, unauthorized pages
│   │       │   └── (dashboard)/      # Dashboard, products, orders, users
│   │       ├── components/           # UI components, charts, forms
│   │       ├── hooks/
│   │       ├── lib/
│   │       └── middleware.ts         # Admin role guard
│   │
│   ├── client/                 # Customer storefront (Next.js, port 3002)
│   │   └── src/
│   │       ├── app/                  # Pages: home, products, cart, orders
│   │       ├── components/           # Product cards, cart, payment form
│   │       ├── stores/cartStore.ts   # Zustand cart state
│   │       └── middleware.ts         # Clerk middleware
│   │
│   ├── auth-service/           # User management via Clerk API (port 8003)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── middleware/authMiddleware.ts
│   │       ├── routes/user.route.ts
│   │       └── utils/                # clerk.ts, kafka.ts
│   │
│   ├── product-service/        # Products & categories CRUD (port 8000)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── controllers/          # product.controller.ts, category.controller.ts
│   │       ├── middleware/authMiddleware.ts
│   │       ├── routes/               # product.route.ts, category.route.ts
│   │       └── utils/kafka.ts
│   │
│   ├── order-service/          # Order management (port 8005)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── middleware/authMiddleware.ts
│   │       ├── routes/order.ts
│   │       └── utils/                # kafka.ts, order.ts, subscriptions.ts
│   │
│   ├── payment-service/        # Razorpay integration (port 8002)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── middleware/authMiddleware.ts
│   │       ├── routes/               # session.route.ts, webhooks.route.ts
│   │       └── utils/                # razorpay.ts, kafka.ts
│   │
│   └── email-service/          # Kafka consumer for transactional emails
│       └── src/
│           ├── index.ts
│           └── utils/mailer.ts
│
├── packages/
│   ├── product-db/             # Prisma client + PostgreSQL schema
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   ├── order-db/               # Mongoose models + MongoDB connection
│   │   └── src/
│   ├── kafka/                  # Shared KafkaJS producer/consumer wrapper
│   │   ├── docker-compose.yml  # 3-broker Kafka cluster + Kafka UI
│   │   └── src/
│   ├── types/                  # Shared TypeScript types & Zod schemas
│   │   └── src/                # auth.ts, cart.ts, order.ts, product.ts
│   ├── typescript-config/      # Shared tsconfig presets
│   └── eslint-config/          # Shared ESLint configs
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Services & Ports

| Service | Framework | Port | Database / External |
|---|---|---|---|
| **client** | Next.js | `3002` | — |
| **admin** | Next.js | `3003` | — |
| **product-service** | Express 5 | `8000` | PostgreSQL |
| **order-service** | Fastify 5 | `8005` | MongoDB |
| **payment-service** | Hono | `8002` | Razorpay |
| **auth-service** | Express 5 | `8003` | Clerk API |
| **email-service** | — (Kafka consumer) | — | Gmail (OAuth2) |
| **Kafka UI** | Docker | `8080` | — |
| **Kafka brokers** | Docker | `9094`, `9095`, `9096` | — |

---

## API Reference

All authenticated endpoints require a Clerk session JWT in the `Authorization: Bearer <token>` header.

### Product Service — `http://localhost:8000`

#### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Service health check |
| `GET` | `/test` | User | Auth test endpoint |

#### Products — `/products`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/products` | None | List products with filters |
| `GET` | `/products/:id` | None | Get product by ID |
| `POST` | `/products` | None* | Create a product |
| `PUT` | `/products/:id` | Admin | Update a product |
| `DELETE` | `/products/:id` | Admin | Delete a product (publishes `product.deleted`) |

**Query parameters for `GET /products`:**

| Param | Values | Description |
|---|---|---|
| `sort` | `asc`, `desc`, `oldest` | Sort by price or creation date (default: newest first) |
| `category` | category slug | Filter by category |
| `search` | string | Case-insensitive name search |
| `limit` | number | Limit result count |

**Create product body (`POST /products`):**

```json
{
  "name": "Classic T-Shirt",
  "shortDescription": "Soft cotton tee",
  "description": "Full product description...",
  "price": 1299,
  "sizes": ["s", "m", "l"],
  "colors": ["black", "white"],
  "images": {
    "black": "https://res.cloudinary.com/.../black.jpg",
    "white": "https://res.cloudinary.com/.../white.jpg"
  },
  "categorySlug": "t-shirts"
}
```

> *Note: `POST /products` currently has no auth middleware. The admin dashboard sends a token, but the endpoint itself is open. Restrict this in production.

#### Categories — `/categories`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | None | List all categories |
| `POST` | `/categories` | Admin | Create a category |
| `PUT` | `/categories/:id` | Admin | Update a category |
| `DELETE` | `/categories/:id` | Admin | Delete a category |

**Create category body:**

```json
{
  "name": "T-Shirts",
  "slug": "t-shirts"
}
```

---

### Order Service — `http://localhost:8005`

#### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Service health check |
| `GET` | `/test` | User | Auth test endpoint |

#### Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/user-orders` | User | Get orders for the authenticated user |
| `GET` | `/orders?limit=N` | Admin | Get recent orders (admin dashboard) |
| `GET` | `/order-chart` | Admin | 6-month order analytics (total vs successful) |

**Order chart response:**

```json
[
  { "month": "January", "total": 42, "successful": 38 },
  { "month": "February", "total": 55, "successful": 50 }
]
```

---

### Payment Service — `http://localhost:8002`

#### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Service health check |

#### Sessions — `/sessions`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/sessions/create-order` | User | Create a Razorpay payment order |
| `POST` | `/sessions/verify-payment` | User | Verify payment signature after checkout |
| `GET` | `/sessions/:order_id` | None | Fetch Razorpay order and payment status |

**Create order body (`POST /sessions/create-order`):**

```json
{
  "cart": [
    {
      "id": 1,
      "name": "Classic T-Shirt",
      "price": 1299,
      "quantity": 2,
      "selectedSize": "m",
      "selectedColor": "black"
    }
  ],
  "shipping": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "address": "123 Main St",
    "city": "Mumbai"
  }
}
```

**Create order response:**

```json
{
  "orderId": "order_xxx",
  "amount": 259800,
  "currency": "INR",
  "keyId": "rzp_test_xxx"
}
```

**Verify payment body (`POST /sessions/verify-payment`):**

```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx",
  "shipping": { "..." },
  "cart": [ "..." ]
}
```

#### Webhooks — `/webhooks`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/webhooks` | None | Webhook health check |
| `POST` | `/webhooks/razorpay` | Razorpay signature | Handle Razorpay `payment.captured` events |

---

### Auth Service — `http://localhost:8003`

#### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Service health check |

#### Users — `/users` (all routes require Admin)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users` | Admin | List all users (via Clerk API) |
| `GET` | `/users/:id` | Admin | Get user by ID |
| `POST` | `/users` | Admin | Create user (publishes `user.created`) |
| `DELETE` | `/users/:id` | Admin | Delete user |

**Create user body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "emailAddress": ["john@example.com"],
  "password": "securepassword123"
}
```

---

## Kafka Events

| Topic | Producer | Consumer | Payload |
|---|---|---|---|
| `user.created` | auth-service | email-service | `{ username, email }` |
| `payment.successful` | payment-service | order-service | `{ userId, email, amount, status, products[] }` |
| `order.created` | order-service | email-service | `{ email, amount, status }` |
| `product.deleted` | product-service | — (no consumer) | product ID (number) |

**Kafka cluster:** 3-broker KRaft cluster defined in `packages/kafka/docker-compose.yml`. Brokers listen on `localhost:9094`, `9095`, `9096`. Kafka UI available at `http://localhost:8080`.

---

## Database Schemas

### PostgreSQL — Products & Categories (Prisma)

**Product**

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK, auto) | |
| `name` | String | |
| `shortDescription` | String | Max ~60 chars in UI |
| `description` | String | |
| `price` | Int | Price in smallest currency unit |
| `sizes` | String[] | e.g. `["s", "m", "l"]` |
| `colors` | String[] | e.g. `["black", "white"]` |
| `images` | JSON | Map of color → image URL |
| `categorySlug` | String (FK) | References `Category.slug` |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Category**

| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK, auto) | |
| `name` | String | |
| `slug` | String (unique) | URL-friendly identifier |

### MongoDB — Orders (Mongoose)

| Field | Type | Notes |
|---|---|---|
| `userId` | String | Clerk user ID |
| `email` | String | Customer email |
| `amount` | Number | Amount in paise |
| `status` | Enum | `"success"` \| `"failed"` |
| `products` | Array | `{ name, quantity, price }[]` |
| `createdAt` | DateTime | Auto (timestamps) |
| `updatedAt` | DateTime | Auto (timestamps) |

---

## Frontend Applications

### Client Storefront — `http://localhost:3002`

| Route | Description |
|---|---|
| `/` | Homepage with featured products |
| `/products` | Product listing with search, filter, sort |
| `/products/[id]` | Product detail page |
| `/cart?step=1\|2\|3` | Multi-step checkout (cart → shipping → payment) |
| `/orders` | User order history (authenticated) |
| `/return?order_id=xxx` | Payment return/status page |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |

**Key features:** Zustand cart with local persistence, Razorpay checkout integration, category filtering, price sorting.

### Admin Dashboard — `http://localhost:3003`

| Route | Description |
|---|---|
| `/` | Dashboard with order charts and analytics |
| `/products` | Product management (CRUD, data table) |
| `/orders` | Order management |
| `/users` | User management |
| `/users/[id]` | User detail view |
| `/sign-in` | Admin sign-in |
| `/unauthorized` | Redirect for non-admin users |

**Access control:** Middleware enforces `metadata.role === "admin"` via Clerk session claims. Non-admin users are redirected to `/unauthorized`.

---

## Authentication & Authorization

Authentication is handled by **Clerk** across all services and frontends.

| Role | Access |
|---|---|
| **Public** | Browse products, view categories, health checks |
| **User** | Cart checkout, view own orders, payment sessions |
| **Admin** | Full CRUD on products/categories, user management, all orders, analytics |

**Setting admin role:** Configure Clerk session claims with `metadata.role = "admin"` for admin users. This is checked via the `CustomJwtSessionClaims` type in `@repo/types`.

```typescript
interface CustomJwtSessionClaims {
  metadata?: {
    role?: "user" | "admin";
  };
}
```

---

## Payment Flow

```
Customer (Client)                Payment Service              Kafka / Order Service
      │                                │                              │
      │  POST /sessions/create-order   │                              │
      │───────────────────────────────>│                              │
      │  { cart, shipping }            │  Create Razorpay order       │
      │<───────────────────────────────│                              │
      │  { orderId, amount, keyId }    │                              │
      │                                │                              │
      │  Razorpay Checkout (client)    │                              │
      │───────────────────────────────>│                              │
      │                                │                              │
      │  POST /sessions/verify-payment │                              │
      │───────────────────────────────>│                              │
      │  { razorpay_* fields }         │  Verify HMAC signature       │
      │                                │  Publish payment.successful  │
      │<───────────────────────────────│─────────────────────────────>│
      │  { status: "success" }         │                              │  Create order in MongoDB
      │                                │                              │  Publish order.created
      │                                │                              │─────────────────────────> Email Service
```

Amounts are calculated in **paise** (INR × 100). Razorpay webhook at `POST /webhooks/razorpay` provides an alternative path for payment confirmation via `payment.captured` events.

---

## Prerequisites

- **Node.js** >= 18
- **pnpm** 9.x (`corepack enable && corepack prepare pnpm@9.0.0 --activate`)
- **Docker** & Docker Compose (for Kafka)
- **PostgreSQL** (local or hosted)
- **MongoDB** (local or hosted)
- **Clerk** account ([clerk.com](https://clerk.com))
- **Razorpay** account ([razorpay.com](https://razorpay.com)) — test keys for development
- **Cloudinary** account (admin product image uploads)
- **Google Cloud** OAuth2 credentials (email service, optional)

---

## Environment Variables

Sample templates are committed as `.env.example` in each app/package. Copy them before running locally:

```bash
# Backend services
cp apps/auth-service/.env.example apps/auth-service/.env
cp apps/product-service/.env.example apps/product-service/.env
cp apps/order-service/.env.example apps/order-service/.env
cp apps/payment-service/.env.example apps/payment-service/.env
cp apps/email-service/.env.example apps/email-service/.env
cp packages/product-db/.env.example packages/product-db/.env

# Next.js apps (use .env.local)
cp apps/client/.env.example apps/client/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

Never commit real `.env` or `.env.local` files — they are gitignored.

### `apps/product-service/.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
CLERK_SECRET_KEY=sk_test_...
```

### `apps/order-service/.env`

```env
MONGO_URL=mongodb://localhost:27017/ecommerce-orders
CLERK_SECRET_KEY=sk_test_...
```

### `apps/payment-service/.env`

```env
CLERK_SECRET_KEY=sk_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

### `apps/auth-service/.env`

```env
CLERK_SECRET_KEY=sk_test_...
```

### `apps/email-service/.env`

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

### `apps/client/.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PRODUCT_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_ORDER_SERVICE_URL=http://localhost:8005
NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://localhost:8002
```

### `apps/admin/.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:8003
NEXT_PUBLIC_PRODUCT_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_ORDER_SERVICE_URL=http://localhost:8005
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

---

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd ecommerce
pnpm install
```

### 2. Start infrastructure

**Kafka cluster:**

```bash
cd packages/kafka
docker compose up -d
```

Verify Kafka UI at [http://localhost:8080](http://localhost:8080).

**PostgreSQL:** Ensure a database exists and set `DATABASE_URL` in the product service `.env`.

**MongoDB:** Ensure MongoDB is running and set `MONGO_URL` in the order service `.env`.

### 3. Run database migrations

```bash
pnpm --filter @repo/product-db db:generate
pnpm --filter @repo/product-db db:migrate
```

### 4. Configure environment variables

Copy the templates above into each service's `.env` / `.env.local` file and fill in your credentials.

### 5. Start all services

From the repository root:

```bash
pnpm dev
```

This starts all apps via Turborepo. To run individual services:

```bash
# Backend services
pnpm --filter product-service dev
pnpm --filter order-service dev
pnpm --filter payment-service dev
pnpm --filter auth-service dev
pnpm --filter email-service dev

# Frontends
pnpm --filter client dev      # http://localhost:3002
pnpm --filter admin dev       # http://localhost:3003
```

### 6. Configure Clerk

1. Create a Clerk application and copy the publishable and secret keys.
2. Add `metadata.role` to session claims for admin users.
3. Configure allowed origins for each service's CORS settings.

### 7. Configure Razorpay

1. Create a Razorpay account and obtain test API keys.
2. Set up a webhook pointing to `https://your-domain/webhooks/razorpay` for `payment.captured` events.
3. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`.

---

## Development Scripts

Run from the repository root:

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps |
| `pnpm check-types` | TypeScript type checking across the monorepo |
| `pnpm format` | Format code with Prettier |

**Per-package filters:**

```bash
pnpm --filter <package-name> dev
pnpm --filter <package-name> build
pnpm --filter @repo/product-db db:generate
pnpm --filter @repo/product-db db:migrate
pnpm --filter @repo/product-db db:deploy    # production migrations
```

---

## Production Considerations

### Security

- Add authentication middleware to `POST /products` — currently unprotected.
- Replace hardcoded CORS origins with environment-based configuration.
- Use HTTPS everywhere; never expose secret keys in client-side code.
- Validate and sanitize all request bodies server-side (partially done via Zod on frontends).
- Rotate Razorpay webhook secrets and Clerk keys regularly.

### Infrastructure

- Deploy Kafka with proper replication, monitoring, and persistence (consider managed services like Confluent Cloud or AWS MSK).
- Use managed PostgreSQL (RDS, Supabase) and MongoDB (Atlas) with connection pooling.
- Run each microservice in its own container with health check endpoints (`/health`).
- Configure Razorpay webhooks to your production payment service URL.

### Observability

- Add structured logging (e.g., Pino) across all services.
- Implement distributed tracing for cross-service request flows.
- Monitor Kafka consumer lag and set up alerts.
- Track Razorpay payment success/failure rates.

### Scalability

- Product and order services can scale horizontally; ensure Kafka consumer groups are configured correctly.
- Use a CDN for product images (Cloudinary handles this).
- Consider caching product listings with Redis for high-traffic storefronts.

### CI/CD

- Turborepo remote caching is supported — link with `turbo login` and `turbo link` for faster builds.
- Run `pnpm check-types && pnpm lint && pnpm build` in CI pipelines.
- Use `db:deploy` (not `db:migrate`) for production database migrations.

---

## License

ISC
