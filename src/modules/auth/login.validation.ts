import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email({ error: "Please provide a valid email address" }))
    .transform((email) => email.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password cannot exceed 128 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;