import {z } from "zod";

export const transferPaymentSchema = z.object({
  senderUserId: z.string().uuid("Invalid sender user ID"),
  senderWalletId: z.string().uuid("Invalid sender wallet ID"),
  receiverWalletId: z.string().uuid("Invalid receiver wallet ID"),
  amount: z.number().positive("Amount must be greater than zero"),
  idempotencyKey: z.string().trim().min(1, "Idempotency key is required"),
}).strict();  