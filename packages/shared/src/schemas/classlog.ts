import { z } from "zod";

export const createClassLogSchema = z.object({
  subjectId: z.string(),
  date: z.string(),
  titre: z.string().min(2),
  contenu: z.string().min(2),
  devoir: z
    .object({
      consigne: z.string().min(2),
      echeance: z.string(),
    })
    .nullable()
    .optional(),
});
export type CreateClassLogInput = z.infer<typeof createClassLogSchema>;
