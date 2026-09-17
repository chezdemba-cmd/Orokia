import { z } from "zod";

export const attendanceTypeSchema = z.enum(["PRESENT", "ABSENT", "RETARD", "EXCUSE"]);

export const attendanceEntrySchema = z.object({
  studentId: z.string(),
  type: attendanceTypeSchema,
  justificatif: z.string().nullable().optional(),
});

export const saveAttendanceSchema = z.object({
  sessionId: z.string(),
  date: z.string(), // YYYY-MM-DD
  entries: z.array(attendanceEntrySchema).min(1),
});
export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;
