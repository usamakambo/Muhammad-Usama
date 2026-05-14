# GGI Coding Task

TypeScript REST API for an AI chat and subscription bundle system. The project uses Express for HTTP routing, Prisma for PostgreSQL access, and a DDD-style clean architecture so business rules stay separate from framework and database code.

## Tech Stack

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- ESLint
- Prettier

## Architecture

The project is organized by business module, then by layer.

```text
src/
  app.ts
  index.ts
  chat/
    controllers/
    domain/
    repositories/
    services/
  subscriptions/
    controllers/
    domain/
    repositories/
    services/
  common/
    config.ts
    date.ts
    errors.ts
    http/
    persistence/
prisma/
  schema.prisma
```

### Layers

- `domain`: Entity models and core business behavior.
- `services`: Application use cases and orchestration.
- `repositories`: Persistence interfaces and Prisma implementations.
- `controllers`: Express route handlers and request/response mapping.
- `common`: Shared config, errors, validation, HTTP middleware, and Prisma client setup.

The domain and services do not depend on Express. Controllers translate HTTP requests into service calls, and repositories hide database details behind interfaces.

## API Security

- All database access is performed through Prisma Client APIs, not interpolated raw SQL.
- Request validation trims and bounds user-controlled strings before they reach services.
- List endpoints support a bounded `limit` query parameter, defaulting to `50` and capped at `100`.
- Express disables `X-Powered-By`, applies common hardening headers, and limits JSON request bodies to `32kb`.
- Errors use a consistent JSON shape. Invalid JSON returns `VALIDATION_ERROR`; unexpected server errors are logged without leaking internals to clients.

## Modules

### AI Chat Module

The chat module supports:

- Accepting a user question.
- Returning a mocked OpenAI response.
- Simulating OpenAI response delay.
- Estimating and storing prompt, completion, and total tokens.
- Storing question and answer history.
- Tracking monthly free usage per user.
- Charging paid bundle quota after free usage is exhausted.
- Returning structured `QUOTA_EXCEEDED` errors when no quota is available.

Free quota is tracked by `YYYY-MM`, so users automatically receive a fresh free quota when the month changes.

### Subscription Bundle Module

The subscription module supports:

- Creating Basic, Pro, and Enterprise bundles.
- Monthly or yearly billing cycles.
- Auto-renew toggle.
- Cancellation at the end of the current billing cycle.
- Preserving usage history after cancellation.
- Simulated renewal processing.
- Simulated payment failure through a configurable random failure rate.

Bundle tiers:

| Tier       | Quota         |
| ---------- | ------------- |
| Basic      | 10 responses  |
| Pro        | 100 responses |
| Enterprise | Unlimited     |

When a user has multiple usable bundles, chat usage is deducted from the bundle with the latest remaining quota, meaning the bundle with the highest remaining allowance is consumed first. Enterprise is treated as unlimited.

## Environment Variables

Create a `.env` file in the project root.

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aichat_db?schema=public"
FREE_MESSAGES_PER_MONTH=3
MOCK_OPENAI_DELAY_MS=750
PAYMENT_FAILURE_RATE=0.15
```

Variable details:

| Variable                  | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `PORT`                    | HTTP server port                            |
| `DATABASE_URL`            | PostgreSQL connection string used by Prisma |
| `FREE_MESSAGES_PER_MONTH` | Monthly free chat limit per user            |
| `MOCK_OPENAI_DELAY_MS`    | Delay for mocked OpenAI response            |
| `PAYMENT_FAILURE_RATE`    | Probability of renewal payment failure      |

## Installation

Install dependencies:

```bash
npm install
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

## Database Setup

Make sure PostgreSQL is running and `DATABASE_URL` points to a valid database.

For local development, push the Prisma schema directly:

```bash
npm run db:push
```

For migration-based development, run:

```bash
npm run db:migrate
```

`prisma/schema.prisma` is the source of truth for the database schema. `database/schema.sql` is only a SQL reference for the current model.

## Running The Project

Build the TypeScript project:

```bash
npm run build
```

Start the compiled API:

```bash
npm start
```

The server will run at:

```text
http://localhost:3000
```

or the port configured in `.env`.

## Scripts

| Script                    | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `npm run prisma:generate` | Generates Prisma Client                         |
| `npm run db:push`         | Pushes Prisma schema to the database            |
| `npm run db:migrate`      | Creates and applies Prisma migrations           |
| `npm run build`           | Generates Prisma Client and compiles TypeScript |
| `npm start`               | Runs `dist/index.js`                            |
| `npm run lint`            | Runs ESLint                                     |
| `npm run format`          | Runs Prettier                                   |
| `npm test`                | Runs the build as a basic verification step     |

## API Endpoints

### Create Chat Message

```http
POST /chat/messages
Content-Type: application/json
```

```json
{
  "userId": "user-1",
  "question": "What is clean architecture?"
}
```

Response:

```json
{
  "data": {
    "id": "...",
    "userId": "user-1",
    "question": "What is clean architecture?",
    "answer": "Mocked OpenAI response: What is clean architecture?",
    "tokens": {
      "promptTokens": 7,
      "completionTokens": 14,
      "totalTokens": 21
    },
    "chargedSource": "free",
    "createdAt": "..."
  }
}
```

### List Chat Messages

```http
GET /chat/messages?userId=user-1&limit=50
```

### Get Monthly Usage

```http
GET /usage/monthly?userId=user-1
```

### Create Subscription Bundle

```http
POST /subscriptions
Content-Type: application/json
```

```json
{
  "userId": "user-1",
  "tier": "pro",
  "billingCycle": "monthly",
  "autoRenew": true
}
```

Valid tiers:

- `basic`
- `pro`
- `enterprise`

Valid billing cycles:

- `monthly`
- `yearly`

### List User Subscriptions

```http
GET /subscriptions?userId=user-1&limit=50
```

### Cancel Subscription

```http
PATCH /subscriptions/:id/cancel
```

Cancellation disables auto-renew and marks the bundle as cancelled, but the bundle remains usable until its current `endDate`.

### Process Renewals

```http
POST /subscriptions/renewals/process
```

This checks active auto-renew subscriptions whose `renewalDate` has passed. Successful renewals reset usage and extend the billing cycle. Failed payments mark the bundle inactive.

## Error Format

Errors are returned in a structured format:

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly free quota exceeded and no bundle is available",
    "details": {
      "freeMessagesPerMonth": 3
    }
  }
}
```

Common error codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `QUOTA_EXCEEDED`
- `PAYMENT_FAILED`
- `INTERNAL_ERROR`

## Notes

- The OpenAI integration is intentionally mocked.
- Users are represented by `userId` strings; there is no separate user module in this task.
