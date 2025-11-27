import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth";
import {
  applyForCandidacy,
  listApprovedCandidates,
  reviewCandidates,
  updateCandidateApproval,
} from "./candidate.controller";

const router = Router();

router.get("/election/:electionId", listApprovedCandidates);
router.post("/apply", authenticate, applyForCandidacy);
router.get(
  "/review",
  authenticate,
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN),
  reviewCandidates,
);
router.patch(
  "/:id/approval",
  authenticate,
  requireRoles(Role.ADMIN, Role.SUPER_ADMIN),
  updateCandidateApproval,
);

export const candidateRoutes = router;
