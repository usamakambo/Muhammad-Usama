# GGI Coding Task

TypeScript REST API for an AI chat system with subscription bundle billing. The project uses Express, Prisma, and PostgreSQL with a Clean Architecture / DDD-style structure.

## Requirement Coverage

### AI Chat Module

- Accepts a user question through `POST /chat/messages`.
- Returns a mocked OpenAI response from `MockOpenAiService`.
- Simulates OpenAI latency with `MOCK_OPENAI_DELAY_MS`.
- Stores question, answer, token usage, charge source, and timestamp in PostgreSQL.
- Tracks monthly free usage per user using `MonthlyFreeUsage`.
- Gives each user `3` free messages per calendar month by default.
- Resets free quota automatically because usage is stored by `YYYY-MM`.
- Requires an active or cancelled-but-not-expired subscription bundle after free quota is used.
- Supports Basic, Pro, and Enterprise bundle quotas.
- Deducts paid chat usage from the bundle with the highest remaining quota.
- Throws structured `QUOTA_EXCEEDED` errors when no free or bundle quota is available.

### Subscription Bundle Module

- Creates Basic, Pro, and Enterprise subscription bundles.
- Supports monthly and yearly billing cycles.
- Supports `autoRenew`.
- Stores `maxMessages`, `priceCents`, `startDate`, `endDate`, and `renewalDate`.
- Processes renewals through `POST /subscriptions/renewals/process`.
- Simulates payment failure using configurable `PAYMENT_FAILURE_RATE`.
- Marks failed renewals as `inactive`.
- Supports cancellation through `PATCH /subscriptions/:id/cancel`.
- Cancellation prevents renewal but keeps the bundle usable until the current `endDate`.
- Usage history is preserved when a subscription is cancelled.

## Tech Stack

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- ESLint
- Prettier

## Architecture

The project is organized by business module first, then by layer.

```text
src/
  app.ts
  index.ts
  chat/
    controllers/
      ChatController.ts
    domain/
      ChatMessage.ts
    repositories/
      ChatMessageRepository.ts
      MonthlyUsageRepository.ts
      PrismaChatMessageRepository.ts
      PrismaMonthlyUsageRepository.ts
    services/
      ChatService.ts
      MockOpenAiService.ts
  subscriptions/
    controllers/
      SubscriptionController.ts
    domain/
      SubscriptionBundle.ts
    repositories/
      SubscriptionBundleRepository.ts
      PrismaSubscriptionBundleRepository.ts
    services/
      SubscriptionService.ts
  common/
    config.ts
    date.ts
    errors.ts
    id.ts
    http/
    persistence/
prisma/
  schema.prisma
  migrations/
```

### Layer Responsibilities

- `domain`: Business entities and business rules. Example: `SubscriptionBundle.consumeOne`, `cancel`, `renew`, and `markInactive`.
- `services`: Application use cases. Example: `ChatService.ask` checks free usage, selects bundle quota, calls the mocked AI service, and saves the chat message.
- `repositories`: Interfaces plus Prisma implementations. Services depend on repository contracts, not direct database queries.
- `controllers`: Express request/response layer. Controllers validate HTTP input and map service results to JSON.
- `common`: Shared configuration, date helpers, error types, validation, middleware, and Prisma client setup.

The domain layer does not depend on Express or Prisma. Database access is isolated inside Prisma repository implementations.

## Database

The database schema is defined in `prisma/schema.prisma`.

Main tables:

- `chat_messages`: Stores user questions, mocked answers, token counts, and whether the response used free or bundle quota.
- `monthly_free_usage`: Stores monthly free usage per user using a composite key of `userId` and `usageMonth`.
- `subscription_bundles`: Stores tier, billing cycle, status, renewal settings, quota, price, and billing dates.

Prisma migrations are kept in `prisma/migrations/` and should be committed to Git.

## Security and Error Handling

- Prisma Client APIs are used for database access, so user input is parameterized instead of being interpolated into raw SQL.
- No `$queryRaw` or `$executeRaw` calls are used.
- User input is validated and trimmed before reaching services.
- Request body size is limited to `32kb`.
- List endpoints use a bounded `limit` query parameter, default `50`, max `100`.
- Subscription IDs are validated as UUIDs before database lookup.
- Express disables `X-Powered-By`.
- Security headers are added through `securityHeaders`.
- Invalid JSON returns a structured `VALIDATION_ERROR`.
- Unexpected server errors return `INTERNAL_ERROR` without exposing internals to the client.

Error response format:

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

## Subscription Tiers

| Tier       | Max Responses | Monthly Price | Yearly Price |
| ---------- | ------------- | ------------- | ------------ |
| Basic      | 10            | 900 cents     | 9000 cents   |
| Pro        | 100           | 2900 cents    | 29000 cents  |
| Enterprise | Unlimited     | 19900 cents   | 199000 cents |

Enterprise uses `maxMessages = null` in the database and is treated as unlimited in the domain entity.

## Environment Variables

Copy `.env.example` to `.env` and update values for your machine.

```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aichat_db?schema=public"
FREE_MESSAGES_PER_MONTH=3
MOCK_OPENAI_DELAY_MS=750
PAYMENT_FAILURE_RATE=0.15
```

| Variable                  | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `PORT`                    | HTTP server port                            |
| `DATABASE_URL`            | PostgreSQL connection string used by Prisma |
| `FREE_MESSAGES_PER_MONTH` | Monthly free chat limit per user            |
| `MOCK_OPENAI_DELAY_MS`    | Mocked OpenAI response delay in ms          |
| `PAYMENT_FAILURE_RATE`    | Random renewal payment failure probability  |

## Installation

```bash
npm install
npm run prisma:generate
```

## Database Setup

Make sure PostgreSQL is running and `DATABASE_URL` points to a valid database.

For local development:

```bash
npm run db:migrate
```

For production-like deployment:

```bash
npx prisma migrate deploy
```

## Running the Project

Build TypeScript:

```bash
npm run build
```

Start the compiled API:

```bash
npm start
```

The API runs at:

```text
http://localhost:3000
```

or whichever port is configured in `.env`.

## Scripts

| Script                    | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `npm run prisma:generate` | Generates Prisma Client                         |
| `npm run db:push`         | Pushes Prisma schema directly to the database   |
| `npm run db:migrate`      | Creates and applies Prisma migrations locally   |
| `npm run build`           | Generates Prisma Client and compiles TypeScript |
| `npm start`               | Runs `dist/index.js`                            |
| `npm run lint`            | Runs ESLint over TypeScript source files        |
| `npm run format`          | Runs Prettier                                   |
| `npm test`                | Runs the build as a basic verification step     |

## API Endpoints

### Create Chat Message

```http
POST /chat/messages
Content-Type: application/json
```

Request:

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
    "id": "4ce5c34e-7b6a-4493-aed2-c6813bf8d0fe",
    "userId": "user-1",
    "question": "What is clean architecture?",
    "answer": "Mocked OpenAI response: What is clean architecture?",
    "tokens": {
      "promptTokens": 7,
      "completionTokens": 14,
      "totalTokens": 21
    },
    "chargedSource": "free",
    "createdAt": "2026-05-14T10:00:00.000Z"
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

Request:

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

Cancellation sets `autoRenew` to `false` and marks the bundle as `cancelled`. The subscription remains usable until the current `endDate`.

### Process Renewals

```http
POST /subscriptions/renewals/process
```

This checks active auto-renew subscriptions whose `renewalDate` has passed.

- Successful renewal resets usage and extends the billing dates.
- Failed simulated payment marks the subscription `inactive`.

`src/` is the TypeScript source. `dist/` is generated JavaScript build output and can be recreated with `npm run build`.
