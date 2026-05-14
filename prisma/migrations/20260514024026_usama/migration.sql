-- CreateEnum
CREATE TYPE "subscription_tier" AS ENUM ('basic', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'cancelled', 'inactive');

-- CreateEnum
CREATE TYPE "charged_source" AS ENUM ('free', 'bundle');

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "charged_source" "charged_source" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_free_usage" (
    "user_id" TEXT NOT NULL,
    "usage_month" CHAR(7) NOT NULL,
    "used_messages" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "monthly_free_usage_pkey" PRIMARY KEY ("user_id","usage_month")
);

-- CreateTable
CREATE TABLE "subscription_bundles" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "subscription_tier" NOT NULL,
    "billing_cycle" "billing_cycle" NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "max_messages" INTEGER,
    "used_messages" INTEGER NOT NULL DEFAULT 0,
    "price_cents" INTEGER NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "renewal_date" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subscription_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_chat_messages_user_created" ON "chat_messages"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_subscription_bundles_user_status_dates" ON "subscription_bundles"("user_id", "status", "end_date", "renewal_date");
