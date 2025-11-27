/* eslint-disable no-console */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const stdId = process.env.SUPER_ADMIN_STD_ID ?? "superadmin";
  const name = process.env.SUPER_ADMIN_NAME ?? "Super Admin";
  const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@example.com";
  const password =
    process.env.SUPER_ADMIN_PASSWORD ?? "ChangeThisSuperPassword!";
  const faculty = process.env.SUPER_ADMIN_FACULTY ?? null;
  const department = process.env.SUPER_ADMIN_DEPARTMENT ?? null;

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = await prisma.user.upsert({
    where: { stdId },
    create: {
      stdId,
      name,
      email,
      role: Role.SUPER_ADMIN,
      faculty,
      department,
      passwordHash,
      isVerified: true,
    },
    update: {
      name,
      email,
      role: Role.SUPER_ADMIN,
      faculty,
      department,
      passwordHash,
      isVerified: true,
    },
    select: {
      id: true,
      stdId: true,
      name: true,
      email: true,
      role: true,
    },
  });

  console.log("Super admin ready:", user);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
