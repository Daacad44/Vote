import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/email";
import { createLog } from "./log.service";

const OTP_DIGITS = 6;

export async function issueOtp(userId: string, email: string) {
  const code = randomInt(10 ** (OTP_DIGITS - 1), 10 ** OTP_DIGITS).toString();
  const codeHash = await bcrypt.hash(code, env.BCRYPT_SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      userId,
      codeHash,
      expiresAt,
    },
  });

  await createLog(userId, "OTP_ISSUED", { expiresAt });

  await sendEmail({
    to: email,
    subject: "Your VoteSecure OTP Code",
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in ${env.OTP_TTL_MINUTES} minutes.</p>`,
  });

  return { expiresAt };
}

export async function verifyOtp(userId: string, code: string) {
  const pending = await prisma.otpCode.findFirst({
    where: {
      userId,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!pending) {
    throw new Error("OTP not found or expired");
  }

  const isValid = await bcrypt.compare(code, pending.codeHash);

  if (!isValid) {
    throw new Error("Invalid OTP");
  }

  await prisma.$transaction([
    prisma.otpCode.update({
      where: { id: pending.id },
      data: { verified: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    }),
  ]);

  await createLog(userId, "OTP_VERIFIED");
}
