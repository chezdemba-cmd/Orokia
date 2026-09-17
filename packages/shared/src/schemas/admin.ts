import { z } from "zod";
import { phoneE164Schema } from "./auth.js";

export const createEcoleSchema = z.object({
  nom: z.string().min(2, "Nom trop court"),
  adresse: z.string().min(2, "Adresse trop courte"),
  telephone: z.string().optional(),
  anneeScolaireActive: z.string().regex(/^\d{4}-\d{4}$/, "Format attendu AAAA-AAAA"),
  direction: z.object({
    telephone: phoneE164Schema,
    motDePasse: z.string().min(8, "8 caractères minimum"),
  }),
});
export type CreateEcoleInput = z.infer<typeof createEcoleSchema>;

export const ecoleSummarySchema = z.object({
  id: z.string(),
  nom: z.string(),
  adresse: z.string(),
  telephone: z.string().nullable(),
  anneeScolaireActive: z.string(),
  createdAt: z.string(),
  effectifEleves: z.number(),
  effectifEnseignants: z.number(),
  nombreClasses: z.number(),
});
export type EcoleSummary = z.infer<typeof ecoleSummarySchema>;
