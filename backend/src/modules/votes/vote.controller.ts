import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import { encryptPayload } from "../../lib/crypto";
import { AuthenticatedRequest } from "../../middleware/auth";
import { castVoteSchema } from "./vote.schema";
import { createLog } from "../../services/log.service";
import { aggregateElectionResults } from "../../services/result.service";
import { getSocket } from "../../lib/socket";

export async function castVote(
  req: AuthenticatedRequest,
  res: Response,
) {
  const payload = castVoteSchema.parse(req.body);

  const election = await prisma.election.findUnique({
    where: { id: payload.electionId },
  });

  if (!election) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Election not found" });
  }

  if (election.status !== "OPEN") {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Election is not accepting votes" });
  }

  const candidate = await prisma.candidate.findFirst({
    where: { id: payload.candidateId, electionId: payload.electionId, approved: true },
  });

  if (!candidate) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Candidate not found" });
  }

  const existingVote = await prisma.vote.findFirst({
    where: {
      electionId: payload.electionId,
      voterId: req.user!.id,
    },
  });

  if (existingVote) {
    return res
      .status(StatusCodes.CONFLICT)
      .json({ message: "You already voted in this election" });
  }

  const encrypted = encryptPayload({
    voterId: req.user!.id,
    candidateId: payload.candidateId,
    electionId: payload.electionId,
    at: new Date().toISOString(),
  });

  await prisma.vote.create({
    data: {
      electionId: payload.electionId,
      voterId: req.user!.id,
      candidateId: payload.candidateId,
      encryptedVote: encrypted.ciphertext,
      nonce: encrypted.nonce,
    },
  });

  await createLog(req.user!.id, "VOTE_CAST", { electionId: payload.electionId });

  const results = await aggregateElectionResults(payload.electionId);
  getSocket()?.emit("resultsUpdated", {
    electionId: payload.electionId,
    results,
  });

  return res.status(StatusCodes.CREATED).json({ message: "Vote recorded" });
}

export async function getResults(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { electionId } = req.params;

  if (!electionId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Election id is required" });
  }

  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });

  if (!election) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Election not found" });
  }

  const results = await aggregateElectionResults(electionId);
  return res.json({ election, results });
}

export async function exportResultsCsv(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { electionId } = req.params;

  if (!electionId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Election id is required" });
  }

  const results = await aggregateElectionResults(electionId);

  const header = "candidateId,name,party,votes";
  const body = results
    .map((result) =>
      [result.id, result.name, result.party ?? "", result.votes].join(","),
    )
    .join("\n");
  const csv = `${header}\n${body}`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"results-${electionId}.csv\"`,
  );

  return res.send(csv);
}
