import {z } from "zod";

export const transferPaymentSchema = z.object({
  senderWalletId: z.string().uuid("Invalid sender wallet ID"),
  receiverWalletId: z.string().uuid("Invalid receiver wallet ID"),
  amount: z.number().positive("Amount must be greater than zero"),
}).strict();  

export const paymentHeadersSchema = z.object({
  "idempotency-key": z
    .string()
    .trim()
    .min(1, "Idempotency key is required"),
}).passthrough();