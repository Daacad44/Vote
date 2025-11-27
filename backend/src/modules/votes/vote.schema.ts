import { z } from "zod";

export const castVoteSchema = z.object({
  electionId: z.string().uuid(),
  candidateId: z.string().uuid(),
});
