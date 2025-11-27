import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  candidateApprovalSchema,
  candidateApplicationSchema,
} from "./candidate.schema";

export async function applyForCandidacy(
  req: AuthenticatedRequest,
  res: Response,
) {
  const payload = candidateApplicationSchema.parse(req.body);

  const election = await prisma.election.findUnique({
    where: { id: payload.electionId },
  });

  if (!election) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Election not found" });
  }

  const alreadyApplied = await prisma.candidate.findFirst({
    where: {
      electionId: payload.electionId,
      ...(req.user?.id ? { ownerId: req.user.id } : {}),
    },
  });

  if (alreadyApplied) {
    return res
      .status(StatusCodes.CONFLICT)
      .json({ message: "You already applied for this election" });
  }

  const candidate = await prisma.candidate.create({
    data: {
      ...payload,
      ownerId: req.user?.id ?? null,
      party: payload.party ?? null,
      manifesto: payload.manifesto ?? null,
      photoUrl: payload.photoUrl ?? null,
    },
  });

  return res.status(StatusCodes.CREATED).json({ candidate });
}

export async function listApprovedCandidates(req: Request, res: Response) {
  const { electionId } = req.params;
  if (!electionId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Election id is required" });
  }
  const candidates = await prisma.candidate.findMany({
    where: { electionId, approved: true },
    select: {
      id: true,
      name: true,
      party: true,
      manifesto: true,
      photoUrl: true,
    },
  });

  return res.json({ candidates });
}

export async function reviewCandidates(
  req: AuthenticatedRequest,
  res: Response,
) {
  const electionId = req.query.electionId as string | undefined;
  const candidates = await prisma.candidate.findMany({
    where: {
      approved: false,
      ...(electionId ? { electionId } : {}),
    },
    include: {
      election: { select: { title: true, id: true } },
      owner: { select: { name: true, stdId: true } },
    },
  });

  return res.json({ candidates });
}

export async function updateCandidateApproval(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { id } = req.params;
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Candidate id is required" });
  }
  const payload = candidateApprovalSchema.parse(req.body);

  const candidate = await prisma.candidate.update({
    where: { id },
    data: { approved: payload.approved },
  });

  return res.json({ candidate });
}
