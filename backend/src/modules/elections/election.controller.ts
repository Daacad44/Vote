import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  statusSchema,
  upsertElectionSchema,
} from "./election.schema";

export async function createElection(
  req: AuthenticatedRequest,
  res: Response,
) {
  const payload = upsertElectionSchema.parse(req.body);

  if (payload.endTime <= payload.startTime) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "End time must be greater than start time" });
  }

  const election = await prisma.election.create({
    data: {
      title: payload.title,
      description: payload.description ?? null,
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
  });

  return res.status(StatusCodes.CREATED).json({ election });
}

export async function updateElection(
  req: AuthenticatedRequest,
  res: Response,
) {
  const payload = upsertElectionSchema.parse(req.body);
  const { id } = req.params;
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Election id is required" });
  }

  const election = await prisma.election.update({
    where: { id },
    data: {
      title: payload.title,
      description: payload.description ?? null,
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
  });

  return res.json({ election });
}

export async function changeElectionStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { id } = req.params;
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Election id is required" });
  }
  const payload = statusSchema.parse(req.body);

  const election = await prisma.election.update({
    where: { id },
    data: { status: payload.status },
  });

  return res.json({ election });
}

export async function listElections(_req: Request, res: Response) {
  const elections = await prisma.election.findMany({
    orderBy: { startTime: "desc" },
    include: {
      candidates: {
        where: { approved: true },
        select: {
          id: true,
          name: true,
          party: true,
          manifesto: true,
          photoUrl: true,
        },
      },
    },
  });

  return res.json({ elections });
}
