import { z } from "zod";

export const registerSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name must contain at most 100 characters"),

  email: z
    .email("Invalid email address")
    .max(254, "Email is too long")
    .transform((email) => email.trim().toLowerCase()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(128, "Password must contain at most 128 characters"),
});

export const loginSchema = z.strictObject({
  email: z
    .email("Invalid email address")
    .max(254, "Email is too long")
    .transform((email) => email.trim().toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must contain at most 128 characters"),
});
