import { afterEach, describe, expect, it, vi } from "vitest";

import ForbiddenError from "../../../shared/errors/ForbiddenError.js";
import NotFoundError from "../../../shared/errors/NotFoundError.js";
import WalletController from "../src/controllers/wallet.controller.js";
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