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
router.post("/", authenticate, requireRoles(Role.ADMIN), createElection);
router.put("/:id", authenticate, requireRoles(Role.ADMIN), updateElection);
router.patch(
  "/:id/status",
  authenticate,
  requireRoles(Role.ADMIN),
  changeElectionStatus,
);

export const electionRoutes = router;
