-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "Ledger" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ledger_paymentId_idx" ON "Ledger"("paymentId");

-- CreateIndex
CREATE INDEX "Ledger_walletId_createdAt_idx" ON "Ledger"("walletId", "createdAt");

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
