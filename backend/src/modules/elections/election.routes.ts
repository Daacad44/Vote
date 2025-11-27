import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, requireRoles } from "../../middleware/auth";
import {
  changeElectionStatus,
  createElection,
  listElections,
  updateElection,
} from "./election.controller";

const router = Router();

router.get("/", listElections);
router.post("/", authenticate, requireRoles(Role.SUPER_ADMIN), createElection);
router.put(
  "/:id",
  authenticate,
  requireRoles(Role.SUPER_ADMIN),
  updateElection,
);
router.patch(
  "/:id/status",
  authenticate,
  requireRoles(Role.SUPER_ADMIN),
  changeElectionStatus,
);

export const electionRoutes = router;
