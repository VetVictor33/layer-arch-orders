# Layer Arch Orders

A payment processing API with layered architecture, featuring deterministic payment processing and comprehensive order management.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Server**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Message Queue**: Redis + BullMQ
- **Queue Dashboard**: Bull Board
- **Validation**: Zod
- **Logging**: Pino
- **Docker**: Docker Compose for local development
- **Testing**: Jest + k6

## Project Structure

```
src/
  ├── controllers/      # HTTP request handlers
  ├── services/         # Business logic layer
  ├── repositories/     # Data access layer
  ├── workers/          # BullMQ job workers
  ├── middleware/       # Request/response middleware (error handling, rate limiting)
  ├── global/
  │   ├── errors/       # Custom error classes
  │   ├── errorHandlers/  # Error handling strategies
  │   └── schemas/      # Validation schemas (Zod)
  ├── utils/
  │   ├── rate-limiting/  # Rate limiting manager (Sliding Window)
  │   ├── idempotency/    # Idempotency key manager
  │   ├── redis/        # Redis connection manager
  │   └── date.ts       # Centralized date utilities
  ├── config/
  │   ├── routes-paths.ts     # Centralized route constants
  │   └── rate-limit-configs.ts # Rate limit configurations
  ├── libs/
  │   ├── bullmq.ts     # Queue manager singleton
  │   ├── bullboard.ts  # Queue dashboard setup
  │   ├── queues.ts     # Type-safe queue enums
  │   └── logger.ts     # Pino logger configuration
  └── server.ts         # Fastify server setup
prisma/
  ├── schema.prisma     # Database schema
  └── migrations/       # Database migrations
docker-compose.yml      # PostgreSQL + Redis setup
```

## Getting Started

### Prerequisites

- Node.js 20.19+
- pnpm
- Docker & Docker Compose (for PostgreSQL)

### Installation

```bash
pnpm install
```

### Database Setup

Start PostgreSQL and Redis containers:

```bash
pnpm run db:up
```

Create/sync database:

```bash
pnpm run db:sync
```

Create migration (after schema changes):

```bash
pnpm run db:migrate-dev <migration-name>
```

### Queue Monitoring

Access Bull Board dashboard for queue monitoring:

```
http://localhost:3333/admin/queues
```

Monitor jobs, view statuses, inspect failed jobs in Dead Letter Queue.

### Development

```bash
pnpm run dev
```

Runs on `http://localhost:3333`

### Build

```bash
pnpm run build
```

### Production

```bash
pnpm start
```

## Features

### Payment Processing

- **Deterministic Card-Based Gateway**: Payment behavior controlled by card number patterns:
  - **Payment Status** (last 2 digits):
    - `XX00` → ERROR
    - `XX10` → DENIED
    - `XX20` → FAILED
    - `XX30` → CANCELED
    - `XX40` → PAID
  - **Processing Time** (first 2 digits):
    - `40...` → Immediate async processing (queue-based)
    - `50...` → 10-30 second delay before processing
- **Mock Payment Gateway**: Full payment processing simulation with controlled delays
- **Standardized Card Numbers**: Predictable payment outcomes for testing

### Idempotency & Request Deduplication

- **Idempotency Keys**: Generate deterministic keys from request data
- **Request Caching**: Store and replay responses for duplicate requests (TTL: 15 minutes)
- **Automatic Detection**: Prevents duplicate order processing
- **Redis-backed**: Efficient in-memory storage with custom timestamp type

### Rate Limiting

- **Global Rate Limiting**: 10 requests per 2 minutes per IP
- **Smart Route Skipping**: Excludes Bull Board admin routes
- **Standard HTTP Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After
- **Detailed Error Responses**: ISO 8601 formatted timestamps and clear feedback

### Queue System (BullMQ + Redis)

- **Asynchronous Processing**: Payment jobs processed in background queue
- **Automatic Retries**: 3 attempts with exponential backoff
- **Dead Letter Queue**: Failed jobs moved to DLQ for manual investigation
- **Job Monitoring**: Bull Board dashboard for real-time queue inspection

### Architecture

- **Layered Design**: Controllers → Services → Repositories
- **Type-Safe**: Full TypeScript with strict typing
- **OOP Patterns**: Service classes, handler classes, worker registrars, manager classes
- **Clean Separation**: Payment processing, DLQ handling, queue management isolated
- **Centralized Configuration**: Route paths and rate limit configs in dedicated files
- **Utility Classes**: DateUtils, RedisManager, RateLimitingManager, IdempotencyKeyManager

### Validation & Error Handling

- **Zod Schemas**: Request validation for order and payment data
- **Comprehensive Error Handling**: Custom handlers for Zod, Prisma, Rate Limit, Validation, and Generic errors
- **Structured Logging**: Pino JSON logs with context
- **HTTP Status Codes**: Proper codes for all scenarios (429 for rate limit, 400 for validation, 409 for conflicts, etc.)

## API Endpoints

### Create Order

**POST** `/order`

Creates a new order and processes payment asynchronously.

Request body:

```json
{
  "product": {
    "id": "PROD-001",
    "price": 99.99
  },
  "customer": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "payment": {
    "type": "CARD",
    "card": {
      "number": "4532015112830366",
      "holderName": "JOHN DOE",
      "cvv": "123",
      "expirationDate": "12/26"
    }
  }
}
```

Response:

```json
{
  "orderId": "uuid",
  "paymentStatus": "PENDING",
  "message": "Order created successfully. Payment processing in queue."
}
```

### Get Order Payment Status

**GET** `/order/:id/payment-status`

Returns the current payment status of an order.

Response:

```json
{
  "orderId": "uuid",
  "paymentStatus": "PENDING|PAID|DENIED|CANCELED|FAILED|ERROR",
  "paymentId": "PAY_xxx",
  "gatewayId": "MOCK_GATEWAY_001"
}
```

**Payment Status Values**:

- `PENDING`: Order created, awaiting payment processing
- `PAID`: Payment successfully processed
- `DENIED`: Payment rejected by gateway
- `FAILED`: Payment processing failed (transient error, may be retried)
- `CANCELED`: Payment was canceled
- `ERROR`: Gateway error (non-recoverable)

## Workflow

1. **Client sends order** → POST `/order`
2. **Idempotency check** - Returns cached response if request was already processed
3. **Order saved immediately** with PENDING status
4. **Payment job enqueued** to Redis/BullMQ
5. **Worker processes payment** asynchronously
6. **Payment outcome determined** by card number pattern (status and processing time)
7. **Retry mechanism** (up to 3 attempts) if payment fails
8. **Dead Letter Queue** for permanent failures
9. **Order status updated** when payment completes
10. **Monitor via Bull Board** at `/admin/queues`

## Rate Limiting

The API implements **Rate Limiting** to prevent abuse:

- **Global limit**: n requests per X seconds per IP (configured on `src/config/rate-limit-configs.ts`)
- **Skipped routes**: Admin UI (`/admin/queues`)
- **Response headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
  - `Retry-After`: ISO 8601 timestamp when safe to retry (on 429 responses)

Example 429 response:

```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "remaining": 0,
  "resetAt": "2026-02-17T14:35:30.000Z",
  "retryAfter": "2026-02-17T14:35:30.000Z",
  "timestamp": "2026-02-17T14:33:30.000Z"
}
```

## Testing Payment Gateway Behavior

The mock payment gateway is deterministic and controlled by card number patterns. Use these test card numbers to simulate different scenarios:

### Payment Status Testing

| Card Pattern       | Status   | Use Case                                        |
| ------------------ | -------- | ----------------------------------------------- |
| `4032015112830300` | ERROR    | Test gateway errors (XX00 ending)               |
| `4032015112830310` | DENIED   | Test denied payments (XX10 ending)              |
| `4032015112830320` | FAILED   | Test failed payments with retries (XX20 ending) |
| `4032015112830330` | CANCELED | Test canceled payments (XX30 ending)            |
| `4032015112830340` | PAID     | Test successful payments (XX40 ending)          |

### Processing Time Testing

| Card Pattern       | Behavior                      | Use Case                            |
| ------------------ | ----------------------------- | ----------------------------------- |
| `4032015112830340` | Immediate async (queue-based) | Fast payment processing (40 prefix) |
| `5032015112830340` | 10-30s delay                  | Slow payment processing (50 prefix) |

**Note**: Combine both patterns (first 2 digits for timing, last 2 digits for status) to test comprehensive scenarios.

## Project Status

**MVP 0.4** Completed

See [MVP Plan](./docs/mvp-plan.md) for detailed roadmap and architecture

## Tests

This project includes unit and load tests. Below are quick references and commands to run them locally.

- **Run unit tests:** `pnpm test` (uses `jest` / `ts-jest`)
- **Watch mode:** `pnpm run test:watch`
- **Run coverage:** `pnpm run test:coverage` — coverage artifacts are written to the `coverage/` folder and an HTML report is available at `coverage/lcov-report/index.html`.

- **Load tests (custom harness):** `pnpm run test:load` (see `tests/load-test-custom.ts`)
- **Load test presets:**
  - Quick: `pnpm run test:load:quick`
  - Moderate: `pnpm run test:load:moderate`
  - Heavy: `pnpm run test:load:heavy`
  - Insane: `pnpm run test:load:insane`

- **k6 load tests:** `pnpm run test:k6` and specific presets like `pnpm run test:k6:quick`.
