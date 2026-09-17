import { z } from "zod";

export const justifyAbsenceSchema = z.object({
  motif: z.string().min(5, "Merci de préciser le motif (5 caractères minimum)."),
});
export type JustifyAbsenceInput = z.infer<typeof justifyAbsenceSchema>;

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().optional(),
});
