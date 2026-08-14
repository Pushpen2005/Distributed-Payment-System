import {z } from "zod";

export const createWalletSchema = z.object({});

export const depositSchema = z.object({
    amount: z.number().positive({ message: "Deposit amount must be a positive number" }),
});

export const withdrawSchema = z.object({
    amount: z.number().positive({ message: "Withdrawal amount must be a positive number" }),
}); 
