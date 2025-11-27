import { Router } from "express";
import multer from "multer";
import { Role } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth";
import {
  importStudents,
  listLogs,
  listUsers,
} from "./admin.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const router = Router();

router.use(authenticate, requireRoles(Role.ADMIN));

router.post("/users/import", upload.single("file"), importStudents);
router.get("/users", listUsers);
router.get("/logs", listLogs);

export const adminRoutes = router;
