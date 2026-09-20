import { z } from "zod";

export const transferPaymentSchema = z.object({
    senderWalletId: z
        .string()
        .uuid("Invalid sender wallet ID"),

    receiverWalletId: z
        .string()
        .uuid("Invalid receiver wallet ID"),

    amount: z
        .number()
        .finite("Amount must be finite")
        .positive("Amount must be greater than zero")
        .refine(
            (value) => Number.isInteger(value * 100),
            "Amount can have at most 2 decimal places"
        ),
}).strict();

export const paymentHeadersSchema = z.object({
    "idempotency-key": z
        .string()
        .trim()
        .min(1, "Idempotency key is required"),
}).passthrough();