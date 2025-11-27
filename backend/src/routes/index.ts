import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { adminRoutes } from "../modules/admin/admin.routes";
import { electionRoutes } from "../modules/elections/election.routes";
import { candidateRoutes } from "../modules/candidates/candidate.routes";
import { voteRoutes } from "../modules/votes/vote.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/elections", electionRoutes);
router.use("/candidates", candidateRoutes);
router.use("/votes", voteRoutes);

export const apiRouter = router;
