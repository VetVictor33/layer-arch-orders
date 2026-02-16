# Layer Arch Orders

A payment processing API with layered architecture, featuring deterministic payment processing and comprehensive order management.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Server**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod
- **Logging**: Pino
- **Docker**: Docker Compose for local development

## Project Structure

```
src/
  ├── controllers/     # HTTP request handlers
  ├── services/        # Business logic layer
  ├── repositories/    # Data access layer
  ├── middleware/      # Request/response middleware
  ├── global/
  │   ├── errors/      # Custom error classes
  │   ├── errorHandlers/  # Error handling strategies
  │   └── schemas/     # Validation schemas (Zod)
  └── server.ts        # Fastify server setup
prisma/
  ├── schema.prisma    # Database schema
  └── migrations/      # Database migrations
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

Start PostgreSQL container:

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

- **Deterministic Payment Processing**:
  - Odd prices → Payment approved
  - Even prices → Payment denied
  - Zero/negative prices → Error
- **Mock Payment Gateway**: Full payment processing simulation
- **Layered Architecture**: Controllers → Services → Repositories
- **Type-Safe**: Full TypeScript with strict typing
- **Validation**: Zod schemas for request validation
- **Error Handling**: Comprehensive error handling system

## API Endpoints

### Create Order

**POST** `/order`

Creates a new order and processes payment.

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

## Project Status

**MVP 0.1** - Core payment processing implemented
**MVP 0.2** - Next

See [MVP Plan](./docs/mvp-plan.md) for detailed roadmap and architecture specifications.
