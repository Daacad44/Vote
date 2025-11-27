import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { signToken } from "../../lib/jwt";
import { createLog } from "../../services/log.service";
import { issueOtp, verifyOtp } from "../../services/otp.service";
import {
  loginSchema,
  otpSchema,
  registerSchema,
} from "./auth.schema";

export async function register(req: Request, res: Response) {
  const payload = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { stdId: payload.stdId },
  });

  if (existing && existing.isVerified) {
    return res
      .status(StatusCodes.CONFLICT)
      .json({ message: "User already registered" });
  }

  const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { stdId: payload.stdId },
    update: {
      name: payload.name,
      email: payload.email,
      faculty: payload.faculty ?? null,
      department: payload.department ?? null,
      passwordHash,
      isVerified: false,
    },
    create: {
      stdId: payload.stdId,
      name: payload.name,
      email: payload.email,
      faculty: payload.faculty ?? null,
      department: payload.department ?? null,
      passwordHash,
    },
  });

  await issueOtp(user.id, user.email);
  await createLog(user.id, "USER_REGISTERED", { stdId: user.stdId });

  return res.status(StatusCodes.CREATED).json({
    message: "Registration successful. Check your email for the OTP code.",
  });
}

export async function login(req: Request, res: Response) {
  const payload = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { stdId: payload.stdId },
  });

  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials" });
  }

  if (!user.isVerified) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Account not verified" });
  }

  const isValid = await bcrypt.compare(payload.password, user.passwordHash);

  if (!isValid) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials" });
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
    stdId: user.stdId,
  });

  await createLog(user.id, "USER_LOGGED_IN");

  return res.json({
    token,
    user: {
      id: user.id,
      stdId: user.stdId,
      name: user.name,
      email: user.email,
      role: user.role,
      faculty: user.faculty,
      department: user.department,
    },
  });
}

export async function verifyOtpCode(req: Request, res: Response) {
  const payload = otpSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { stdId: payload.stdId },
  });

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  await verifyOtp(user.id, payload.code);

  return res.json({ message: "OTP verified successfully" });
}

export async function resendOtp(req: Request, res: Response) {
  const payload = otpSchema.pick({ stdId: true }).parse(req.body);
  const user = await prisma.user.findUnique({
    where: { stdId: payload.stdId },
  });

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  await issueOtp(user.id, user.email);
  await createLog(user.id, "OTP_RESENT");

  return res.json({ message: "OTP sent" });
}
