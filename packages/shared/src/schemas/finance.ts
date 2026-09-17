import { z } from "zod";

export const modePaiementSchema = z.enum(["ESPECES", "ORANGE_MONEY", "MOOV_MONEY", "VIREMENT_BANCAIRE"]);

export const recordPaymentSchema = z
  .object({
    montant: z.number().positive(),
    modePaiement: modePaiementSchema,
    referenceTransaction: z.string().nullable().optional(),
    remisPar: z.string().min(1),
  })
  .refine((v) => v.modePaiement === "ESPECES" || !!v.referenceTransaction, {
    message: "Référence de transaction requise pour ce moyen de paiement.",
    path: ["referenceTransaction"],
  });
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const payrollLineInputSchema = z.object({
  teacherId: z.string(),
  heures: z.number().min(0).default(0),
  indemniteTransport: z.number().min(0).default(0),
  primeResponsabilite: z.number().min(0).default(0),
});

export const generatePayrollSchema = z.object({
  periode: z.string().regex(/^\d{4}-\d{2}$/, "Format attendu AAAA-MM"),
  lines: z.array(payrollLineInputSchema).min(1),
});
export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
