import type { Response } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { Role } from "@prisma/client";
import { z } from "zod";
import { AuthenticatedRequest } from "../../middleware/auth";
import { parseStudentCsv } from "../../utils/csv";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { createLog } from "../../services/log.service";

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export async function importStudents(
  req: AuthenticatedRequest,
  res: Response,
) {
  const file = req.file;
  if (!file) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "CSV file is required" });
  }

  const students = parseStudentCsv(file.buffer);
  if (!students.length) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "CSV file empty" });
  }

  const passwordHash = await bcrypt.hash("Temp1234!", env.BCRYPT_SALT_ROUNDS);
  await prisma.$transaction(
    students.map((student) =>
      prisma.user.upsert({
        where: { stdId: student.stdId },
        update: {
          name: student.name,
          email: student.email,
          faculty: student.faculty ?? null,
          department: student.department ?? null,
          role: Role.STUDENT,
        },
        create: {
          stdId: student.stdId,
          name: student.name,
          email: student.email,
          faculty: student.faculty ?? null,
          department: student.department ?? null,
          role: Role.STUDENT,
          passwordHash,
        },
      }),
    ),
  );

  await createLog(req.user?.id ?? null, "ADMIN_IMPORTED_STUDENTS", {
    total: students.length,
  });

  return res.json({ total: students.length });
}

export async function listUsers(_req: AuthenticatedRequest, res: Response) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      stdId: true,
      name: true,
      email: true,
      faculty: true,
      department: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  return res.json({ users });
}

export async function listLogs(_req: AuthenticatedRequest, res: Response) {
  const logs = await prisma.log.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: {
        select: { stdId: true, name: true },
      },
    },
  });

  return res.json({ logs });
}

export async function updateUserRole(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { id } = req.params;
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "User id is required" });
  }

  const payload = updateRoleSchema.parse(req.body);

  const target = await prisma.user.findUnique({ where: { id } });

  if (!target) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  if (payload.role === target.role) {
    return res.json({ user: target });
  }

  if (req.user?.id === id && payload.role !== Role.SUPER_ADMIN) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Another super admin must change your role" });
  }

  if (target.role === Role.SUPER_ADMIN && payload.role !== Role.SUPER_ADMIN) {
    const remaining = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN },
    });
    if (remaining <= 1) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "At least one super admin is required" });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: payload.role },
    select: {
      id: true,
      stdId: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  await createLog(req.user?.id ?? null, "USER_ROLE_UPDATED", {
    targetId: id,
    role: payload.role,
  });

  return res.json({ user: updated });
}
