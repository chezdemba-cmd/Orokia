import { z } from "zod";

export const createAnnouncementSchema = z.object({
  titre: z.string().min(2),
  corps: z.string().min(2),
  cible: z.string().min(1), // libellé libre de l'audience (ex. "Toute l'école", "9e A")
  statut: z.enum(["BROUILLON", "PROGRAMMEE", "PUBLIEE"]).default("BROUILLON"),
  programmeAt: z.string().nullable().optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
