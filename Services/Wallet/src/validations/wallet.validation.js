import {z } from "zod";

export const createWalletSchema = z.object({
    userId: z.string().uuid({ message: "Invalid user ID" }),
});

export const depositSchema = z.object({
    userId: z.string().uuid({ message: "Invalid user ID" }),
    amount: z.number().positive({ message: "Deposit amount must be a positive number" }),
});

export const withdrawSchema = z.object({
    userId: z.string().uuid({ message: "Invalid user ID" }),
    amount: z.number().positive({ message: "Withdrawal amount must be a positive number" }),
}); 
