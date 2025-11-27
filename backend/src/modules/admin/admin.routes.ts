import { Router } from "express";
import multer from "multer";
import { Role } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth";
import {
  importStudents,
  listLogs,
  listUsers,
  updateUserRole,
} from "./admin.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate);
router.use(requireRoles(Role.ADMIN, Role.SUPER_ADMIN));

router.post(
  "/users/import",
  requireRoles(Role.SUPER_ADMIN),
  upload.single("file"),
  importStudents,
);
router.get("/users", listUsers);
router.get("/logs", listLogs);
router.patch(
  "/users/:id/role",
  requireRoles(Role.SUPER_ADMIN),
  updateUserRole,
);

export const adminRoutes = router;
