import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(12),
  EMAIL_FROM: z.string().email().default("no-reply@votesecure.com"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  VOTE_AES_KEY_BASE64: z
    .string()
    .min(43, "VOTE_AES_KEY_BASE64 must be a base64 encoded 32 byte key"),
  SOCKET_ORIGIN: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  OTP_TTL_MINUTES: process.env.OTP_TTL_MINUTES,
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  VOTE_AES_KEY_BASE64: process.env.VOTE_AES_KEY_BASE64,
  SOCKET_ORIGIN: process.env.SOCKET_ORIGIN,
});
