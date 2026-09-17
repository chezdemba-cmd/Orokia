import { z } from "zod";

export const gradeValueSchema = z.number().min(0).max(20).nullable();

export const gradeEntrySchema = z.object({
  studentId: z.string(),
  devoir1: gradeValueSchema,
  devoir2: gradeValueSchema,
  composition: gradeValueSchema,
});
export type GradeEntryInput = z.infer<typeof gradeEntrySchema>;

export const saveGradesSchema = z.object({
  entries: z.array(gradeEntrySchema).min(1),
});
export type SaveGradesInput = z.infer<typeof saveGradesSchema>;

export const gradeCorrectionSchema = z.object({
  devoir1: gradeValueSchema.optional(),
  devoir2: gradeValueSchema.optional(),
  composition: gradeValueSchema.optional(),
  motif: z.string().min(10, "Le motif doit être détaillé (10 caractères minimum)."),
});
export type GradeCorrectionInput = z.infer<typeof gradeCorrectionSchema>;
