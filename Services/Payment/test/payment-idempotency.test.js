import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
    prisma: {},
    walletClient: {},
    paymentRepository: {},
    idempotencyRepository: {},
}));

vi.mock("../src/config/db.js", () => ({
    prisma: state.prisma,
}));

vi.mock("../src/clients/wallet.client.js", () => ({
    default: state.walletClient,
}));

vi.mock("../src/repositories/payment.repository.js", () => ({
    default: state.paymentRepository,
}));

vi.mock("../src/repositories/idempotency.repository.js", () => ({
    default: state.idempotencyRepository,
}));

const { default: PaymentService } = await import(
    "../src/services/payment.service.js"
);

const request = {
    userId: "11111111-1111-4111-8111-111111111111",
    senderWalletId: "22222222-2222-4222-8222-222222222222",
    receiverWalletId: "33333333-3333-4333-8333-333333333333",
    amount: 10,
    idempotencyKey: "transfer-1",
};

const createPayment = (id = "payment-1") => ({
    id,
    senderWalletId: request.senderWalletId,
    receiverWalletId: request.receiverWalletId,
    amount: request.amount,
    status: "PROCESSING",
});

beforeEach(() => {
    Object.assign(state.paymentRepository, {
        createPayment: vi.fn().mockResolvedValue(createPayment()),
        updateStatus: vi.fn().mockResolvedValue(undefined),
    });
    Object.assign(state.idempotencyRepository, {
        create: vi.fn().mockResolvedValue({
            id: "key-1",
            paymentId: null,
            status: "PROCESSING",
            expiresAt: new Date(Date.now() + 60_000),
        }),
        findByUserAndKey: vi.fn(),
        attachPayment: vi.fn().mockResolvedValue(undefined),
        updateStatus: vi.fn().mockResolvedValue(undefined),
    });
    Object.assign(state.walletClient, {
        verifyOwnership: vi.fn().mockResolvedValue({ ownsWallet: true }),
        executeTransfer: vi.fn().mockResolvedValue({
            paymentId: "payment-1",
            status: "SUCCESS",
        }),
        getTransferStatus: vi.fn(),
    });
    Object.assign(state.prisma, {
        $transaction: vi.fn(async (callback) => callback(state.prisma)),
    });
});

const transfer = (overrides = {}) =>
    PaymentService.transferPayment(
        overrides.userId || request.userId,
        overrides.senderWalletId || request.senderWalletId,
        overrides.receiverWalletId || request.receiverWalletId,
        overrides.amount ?? request.amount,
        overrides.idempotencyKey || request.idempotencyKey
    );

describe("PaymentService idempotency coordination", () => {
    it("rejects invalid amounts and self-transfers before ownership checks", async () => {
        await expect(transfer({ amount: 0 })).rejects.toMatchObject({
            code: "INVALID_AMOUNT",
        });
        await expect(
            transfer({ receiverWalletId: request.senderWalletId })
        ).rejects.toMatchObject({
            code: "SELF_TRANSFER_NOT_ALLOWED",
        });
        expect(state.walletClient.verifyOwnership).not.toHaveBeenCalled();
    });

    it("replays the stored response for a completed duplicate request", async () => {
        const response = {
            status: "SUCCESS",
            paymentId: "payment-1",
        };
        state.idempotencyRepository.create
            .mockResolvedValueOnce({
                id: "key-1",
                paymentId: null,
                status: "PROCESSING",
                expiresAt: new Date(Date.now() + 60_000),
            })
            .mockRejectedValueOnce({
                code: "P2002",
                constructor: { name: "PrismaClientKnownRequestError" },
            });
        state.idempotencyRepository.findByUserAndKey.mockResolvedValue({
            requestHash: `${request.senderWalletId}-${request.receiverWalletId}-${request.amount}-INR`,
            status: "SUCCESS",
            response,
            paymentId: "payment-1",
            expiresAt: new Date(Date.now() - 60_000),
        });

        const first = await transfer();
        const second = await transfer();

        expect(first.status).toBe("SUCCESS");
        expect(second).toEqual(response);
        expect(state.walletClient.executeTransfer).toHaveBeenCalledTimes(1);
    });

    it("rejects a reused key with a different request", async () => {
        state.idempotencyRepository.create.mockRejectedValue({
            code: "P2002",
            constructor: { name: "PrismaClientKnownRequestError" },
        });
        state.idempotencyRepository.findByUserAndKey.mockResolvedValue({
            requestHash: "different-request",
            status: "SUCCESS",
            response: { status: "SUCCESS" },
            expiresAt: new Date(Date.now() + 60_000),
        });

        await expect(transfer()).rejects.toMatchObject({
            code: "IDEMPOTENCY_KEY_REUSED",
        });
        expect(state.walletClient.executeTransfer).not.toHaveBeenCalled();
    });

    it("scopes idempotency records to the authenticated user", async () => {
        const otherUserId = "44444444-4444-4444-8444-444444444444";

        await expect(transfer({ userId: otherUserId })).resolves.toMatchObject({
            status: "SUCCESS",
        });

        expect(state.idempotencyRepository.create).toHaveBeenCalledWith(
            state.prisma,
            expect.objectContaining({ userId: otherUserId })
        );
    });

    it("allows only one effective transfer for concurrent identical requests", async () => {
        let createCalls = 0;
        state.idempotencyRepository.create.mockImplementation(async () => {
            createCalls += 1;
            if (createCalls === 1) {
                return {
                    id: "key-1",
                    paymentId: null,
                    status: "PROCESSING",
                    expiresAt: new Date(Date.now() + 60_000),
                };
            }

            const error = new Error("unique constraint");
            error.code = "P2002";
            error.constructor = { name: "PrismaClientKnownRequestError" };
            throw error;
        });
        state.idempotencyRepository.findByUserAndKey.mockResolvedValue({
            requestHash: `${request.senderWalletId}-${request.receiverWalletId}-${request.amount}-INR`,
            status: "PROCESSING",
            paymentId: "payment-1",
            expiresAt: new Date(Date.now() + 60_000),
        });

        const results = await Promise.all([transfer(), transfer()]);

        expect(results).toContainEqual(
            expect.objectContaining({ status: "PROCESSING" })
        );
        expect(state.walletClient.executeTransfer).toHaveBeenCalledTimes(1);
    });

    it("keeps an ambiguous wallet outcome processing", async () => {
        const networkError = new Error("connection reset");
        state.walletClient.executeTransfer.mockRejectedValue(networkError);
        state.walletClient.getTransferStatus.mockResolvedValue({
            found: false,
            status: null,
        });

        await expect(transfer()).rejects.toMatchObject({
            code: "TRANSFER_OUTCOME_UNKNOWN",
            statusCode: 503,
        });
        expect(state.paymentRepository.updateStatus).not.toHaveBeenCalled();
        expect(state.idempotencyRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("finalizes success when status reconciliation finds the transfer", async () => {
        state.walletClient.executeTransfer.mockRejectedValue(
            new Error("response lost")
        );
        state.walletClient.getTransferStatus.mockResolvedValue({
            found: true,
            status: "SUCCESS",
            paymentId: "payment-1",
        });

        const result = await transfer();

        expect(result).toMatchObject({
            status: "SUCCESS",
            paymentId: "payment-1",
        });
        expect(state.paymentRepository.updateStatus).toHaveBeenCalledWith(
            state.prisma,
            "payment-1",
            "SUCCESS"
        );
        expect(state.idempotencyRepository.updateStatus).toHaveBeenCalledWith(
            state.prisma,
            "key-1",
            "SUCCESS",
            expect.objectContaining({ status: "SUCCESS" })
        );
    });

    it("persists only Prisma-compatible failure codes", async () => {
        const walletError = new Error("wallet rejected transfer");
        walletError.code = "UNEXPECTED_WALLET_ERROR";
        walletError.statusCode = 409;
        state.walletClient.executeTransfer.mockRejectedValue(walletError);

        await expect(transfer()).rejects.toBe(walletError);

        expect(state.paymentRepository.updateStatus).toHaveBeenCalledWith(
            state.prisma,
            "payment-1",
            "FAILED",
            "INTERNAL_ERROR"
        );
        expect(state.idempotencyRepository.updateStatus).toHaveBeenCalledWith(
            state.prisma,
            "key-1",
            "FAILED",
            expect.objectContaining({ code: "INTERNAL_ERROR" })
        );
    });
});
