import { prisma } from "../lib/prisma";

type CandidateSummary = {
  id: string;
  name: string;
  party: string | null;
};

type VoteGroupRow = {
  candidateId: string | null;
  _count: {
    _all: number;
  };
};

export type ElectionResultRow = CandidateSummary & { votes: number };

export async function aggregateElectionResults(
  electionId: string,
): Promise<ElectionResultRow[]> {
  const grouped = await prisma.vote.groupBy({
    by: ["candidateId"],
    _count: { _all: true },
    where: { electionId },
  });

  const candidates = await prisma.candidate.findMany({
    where: { electionId },
    select: {
      id: true,
      name: true,
      party: true,
    },
  });

  const counts = new Map<string, number>();
  grouped.forEach((row) => {
    const typedRow = row as VoteGroupRow;
    if (typedRow.candidateId) {
      counts.set(typedRow.candidateId, typedRow._count._all);
    }
  });

  return candidates.map((candidate) => ({
    ...candidate,
    votes: counts.get(candidate.id) ?? 0,
  }));
}
