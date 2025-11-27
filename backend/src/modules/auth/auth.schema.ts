import { z } from "zod";

export const registerSchema = z.object({
  stdId: z.string().min(3),
  name: z.string().min(3),
  email: z.string().email(),
  faculty: z.string().optional(),
  department: z.string().optional(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  stdId: z.string().min(3),
  password: z.string().min(8),
});

export const otpSchema = z.object({
  stdId: z.string().min(3),
  code: z.string().length(6),
});
