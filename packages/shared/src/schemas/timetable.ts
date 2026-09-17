import { z } from "zod";

export const createTimetableSlotSchema = z.object({
  subjectId: z.string(),
  teacherId: z.string(),
  jour: z.number().int().min(1).max(5),
  heureDebut: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format attendu HH:MM"),
  dureeMinutes: z.number().int().min(15).max(240),
  salle: z.string().min(1),
});
export type CreateTimetableSlotInput = z.infer<typeof createTimetableSlotSchema>;
