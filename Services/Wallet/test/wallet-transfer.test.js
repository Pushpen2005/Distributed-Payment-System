import { afterEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import BadRequestError from "../../../shared/errors/BadRequestError.js";
import ForbiddenError from "../../../shared/errors/ForbiddenError.js";
import NotFoundError from "../../../shared/errors/NotFoundError.js";
import cachedWallet from "../src/cache/walletBalance.cache.js";
import { prisma } from "../src/config/db.js";
import WalletController from "../src/controllers/wallet.controller.js";
import LedgerRepository from "../src/repositories/ledger.repository.js";
import WalletRepository from "../src/repositories/wallet.repository.js";
import WalletService from "../src/services/wallet.service.js";

describe("Wallet ownership validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("succeeds for the wallet owner", async () => {
    vi.spyOn(WalletRepository, "findById").mockResolvedValue({
      id: "wallet-1",
      userId: "user-1",
    });

    await expect(
      WalletService.verifyOwnership("user-1", "wallet-1")
    ).resolves.toEqual({ ownsWallet: true });
  });

  it("rejects a different owner", async () => {
    vi.spyOn(WalletRepository, "findById").mockResolvedValue({
      id: "wallet-1",
      userId: "user-2",
    });

    await expect(
      WalletService.verifyOwnership("user-1", "wallet-1")
    ).rejects.toMatchObject({
      constructor: ForbiddenError,
      code: "WALLET_OWNERSHIP_MISMATCH",
    });
  });

  it("rejects a missing sender wallet", async () => {
    vi.spyOn(WalletRepository, "findById").mockResolvedValue(null);

    await expect(
      WalletService.verifyOwnership("user-1", "missing-wallet")
    ).rejects.toMatchObject({
      constructor: NotFoundError,
      code: "WALLET_NOT_FOUND",
    });
  });

  it("returns the ownership result from the controller", async () => {
    vi.spyOn(WalletService, "verifyOwnership").mockResolvedValue({
      ownsWallet: false,
    });

    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await WalletController.verifyOwnership(
      {
        body: {
          senderUserId: "user-1",
          senderWalletId: "wallet-1",
        },
      },
      response,
      vi.fn()
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: "Ownership verified successfully",
      data: {
        ownsWallet: false,
      },
    });
  });
});

describe("Wallet transfer atomicity and retry safety", () => {
  const sender = {
    id: "wallet-1",
    userId: "user-1",
    balance: new Prisma.Decimal("100.00"),
    status: "ACTIVE",
  };
  const receiver = {
    id: "wallet-2",
    userId: "user-2",
    balance: new Prisma.Decimal("25.00"),
    status: "ACTIVE",
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid amounts and self-transfers before opening a transaction", async () => {
    const transaction = vi.spyOn(prisma, "$transaction");

    await expect(
      WalletService.executeTransfer("payment-1", "wallet-1", "wallet-2", 0)
    ).rejects.toMatchObject({
      constructor: BadRequestError,
      code: "INVALID_AMOUNT",
    });
    await expect(
      WalletService.executeTransfer("payment-1", "wallet-1", "wallet-1", 10)
    ).rejects.toMatchObject({
      constructor: BadRequestError,
      code: "SELF_TRANSFER_NOT_ALLOWED",
    });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns an existing payment without creating duplicate ledger entries", async () => {
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback) =>
      callback(prisma)
    );
    vi.spyOn(WalletRepository, "findByIdsForUpdate").mockResolvedValue([
      sender,
      receiver,
    ]);
    vi.spyOn(LedgerRepository, "findByPaymentId").mockResolvedValue([
      {
        walletId: "wallet-1",
        type: "DEBIT",
        amount: new Prisma.Decimal("10.00"),
      },
      {
        walletId: "wallet-2",
        type: "CREDIT",
        amount: new Prisma.Decimal("10.00"),
      },
    ]);
    vi.spyOn(cachedWallet, "delete").mockResolvedValue(undefined);
    const updateBalance = vi.spyOn(WalletRepository, "updateBalance");
    const createEntries = vi.spyOn(LedgerRepository, "createEntries");

    const result = await WalletService.executeTransfer(
      "payment-1",
      "wallet-1",
      "wallet-2",
      10
    );

    expect(result.alreadyProcessed).toBe(true);
    expect(updateBalance).not.toHaveBeenCalled();
    expect(createEntries).not.toHaveBeenCalled();
  });

  it("propagates ledger failure so the transaction can roll back balances", async () => {
    const balances = {
      sender: new Prisma.Decimal("100.00"),
      receiver: new Prisma.Decimal("25.00"),
    };
    vi.spyOn(prisma, "$transaction").mockImplementation(async (callback) => {
      const before = { ...balances };
      try {
        return await callback(prisma);
      } catch (error) {
        balances.sender = before.sender;
        balances.receiver = before.receiver;
        throw error;
      }
    });
    vi.spyOn(WalletRepository, "findByIdsForUpdate").mockResolvedValue([
      { ...sender, balance: balances.sender },
      { ...receiver, balance: balances.receiver },
    ]);
    vi.spyOn(LedgerRepository, "findByPaymentId").mockResolvedValue([]);
    vi.spyOn(WalletRepository, "updateBalance").mockImplementation(
      async (_tx, walletId, balance) => {
        if (walletId === "wallet-1") balances.sender = balance;
        if (walletId === "wallet-2") balances.receiver = balance;
      }
    );
    vi.spyOn(LedgerRepository, "createEntries").mockRejectedValue(
      new Error("ledger insert failed")
    );

    await expect(
      WalletService.executeTransfer(
        "payment-rollback",
        "wallet-1",
        "wallet-2",
        10
      )
    ).rejects.toThrow("ledger insert failed");
    expect(balances.sender.toString()).toBe("100");
    expect(balances.receiver.toString()).toBe("25");
  });
});