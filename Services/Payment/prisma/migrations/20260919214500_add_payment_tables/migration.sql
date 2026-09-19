-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentFailureCode" AS ENUM ('INSUFFICIENT_BALANCE', 'WALLET_NOT_FOUND', 'WALLET_FROZEN', 'SELF_TRANSFER_NOT_ALLOWED', 'INTERNAL_ERROR');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "senderWalletId" UUID NOT NULL,
    "receiverWalletId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL,
    "failureCode" "PaymentFailureCode",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL,
    "response" JSONB,
    "paymentId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_senderWalletId_idx" ON "payments"("senderWalletId");

-- CreateIndex
CREATE INDEX "payments_receiverWalletId_idx" ON "payments"("receiverWalletId");

-- CreateIndex
CREATE INDEX "payments_senderWalletId_createdAt_idx" ON "payments"("senderWalletId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_paymentId_key" ON "idempotency_keys"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_userId_idempotencyKey_key" ON "idempotency_keys"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
