import { z } from "zod";
import { ElectionStatus } from "@prisma/client";

export const upsertElectionSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export const statusSchema = z.object({
  status: z.nativeEnum(ElectionStatus),
});
