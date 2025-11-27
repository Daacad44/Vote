import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth";
import {
  castVote,
  exportResultsCsv,
  getResults,
} from "./vote.controller";

const router = Router();

router.post("/", authenticate, castVote);
router.get("/election/:electionId", authenticate, getResults);
router.get(
  "/election/:electionId/export",
  authenticate,
  requireRoles(Role.ADMIN),
  exportResultsCsv,
);

export const voteRoutes = router;
