import { z } from "zod";

export const candidateApplicationSchema = z.object({
  electionId: z.string().uuid(),
  name: z.string().min(3),
  party: z.string().min(1).optional(),
  manifesto: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export const candidateApprovalSchema = z.object({
  approved: z.boolean(),
});
