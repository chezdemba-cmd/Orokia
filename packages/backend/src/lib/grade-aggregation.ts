import type { Prisma, PrismaClient } from "@prisma/client";
import { computeGeneralAverage } from "./grading.js";
import { computeRanks } from "./ranking.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface StudentAverageResult {
  studentId: string;
  average: number | null;
  rank: number | null;
}

/**
 * Calcule la moyenne générale (et le rang) de chaque élève d'une classe pour
 * un trimestre donné, à partir des notes brutes (Grade) et des coefficients
 * (TeacherAssignment). Un élève avec une seule matière incomplète a une
 * moyenne null et un rang null (voir lib/grading.ts et lib/ranking.ts).
 */
export async function computeClassGeneralAverages(
  prisma: DbClient,
  classeId: string,
  termId: string,
): Promise<Map<string, StudentAverageResult>> {
  const [assignments, grades, students] = await Promise.all([
    prisma.teacherAssignment.findMany({ where: { classeId }, select: { subjectId: true, coefficient: true } }),
    prisma.grade.findMany({ where: { classeId, termId }, select: { studentId: true, subjectId: true, average: true } }),
    prisma.student.findMany({ where: { classeId }, select: { id: true } }),
  ]);

  const coefficientBySubject = new Map(assignments.map((a) => [a.subjectId, a.coefficient]));
  const gradesByStudent = new Map<string, { average: number | null; coefficient: number }[]>();
  for (const g of grades) {
    const coefficient = coefficientBySubject.get(g.subjectId) ?? 1;
    const list = gradesByStudent.get(g.studentId) ?? [];
    list.push({ average: g.average === null ? null : Number(g.average), coefficient });
    gradesByStudent.set(g.studentId, list);
  }

  const averages = students.map((s) => ({
    studentId: s.id,
    average: computeGeneralAverage(gradesByStudent.get(s.id) ?? []),
  }));

  const ranks = computeRanks(averages.map((a) => ({ id: a.studentId, average: a.average })));

  const result = new Map<string, StudentAverageResult>();
  for (const a of averages) {
    result.set(a.studentId, { studentId: a.studentId, average: a.average, rank: ranks.get(a.studentId) ?? null });
  }
  return result;
}
