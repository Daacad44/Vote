import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export async function createLog(
  userId: string | null,
  action: string,
  meta?: Prisma.InputJsonValue,
) {
  await prisma.log.create({
    data: {
      action,
      ...(meta !== undefined ? { meta } : {}),
      ...(userId
        ? {
            user: {
              connect: { id: userId },
            },
          }
        : {}),
    },
  });
}
