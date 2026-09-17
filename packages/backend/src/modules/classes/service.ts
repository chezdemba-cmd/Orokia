import type { Niveau } from "@prisma/client";
import { computeClassGeneralAverages } from "../../lib/grade-aggregation.js";
import { getCurrentTerm } from "../../lib/term.js";
import { round2 } from "@orokia/shared";
import type { Db } from "../../lib/tenant-context.js";

export class ClassesService {
  constructor(private prisma: Db) {}

  async list(ecoleId: string, niveau?: Niveau) {
    const term = await getCurrentTerm(this.prisma, ecoleId);
    const classes = await this.prisma.classe.findMany({
      where: niveau ? { ecoleId, niveau } : { ecoleId },
      include: {
        professeurPrincipal: { select: { nom: true } },
        students: { select: { id: true } },
        assignments: { select: { subjectId: true } },
      },
      orderBy: { nom: "asc" },
    });

    return Promise.all(
      classes.map(async (c) => {
        const averages = await computeClassGeneralAverages(this.prisma, c.id, term.id);
        const values = [...averages.values()].map((a) => a.average).filter((v): v is number => v !== null);
        const moyenne = values.length > 0 ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null;

        const attendances = await this.prisma.attendance.groupBy({
          by: ["type"],
          where: { classeId: c.id },
          _count: true,
        });
        const totalAttendance = attendances.reduce((sum, a) => sum + a._count, 0);
        const presentCount = attendances
          .filter((a) => a.type === "PRESENT" || a.type === "RETARD")
          .reduce((sum, a) => sum + a._count, 0);
        const presence = totalAttendance > 0 ? round2((presentCount / totalAttendance) * 100) : null;

        const expectedGrades = c.students.length * c.assignments.length;
        const completedGrades = await this.prisma.grade.count({
          where: { classeId: c.id, termId: term.id, average: { not: null } },
        });
        const statutSaisieNotes =
          completedGrades >= expectedGrades ? "Complètes" : `${expectedGrades - completedGrades} manquantes`;

        return {
          id: c.id,
          nom: c.nom,
          niveau: c.niveau,
          effectif: c.students.length,
          professeurPrincipal: c.professeurPrincipal?.nom ?? null,
          moyenne,
          presence,
          statutSaisieNotes,
        };
      }),
    );
  }

  async getRoster(classeId: string, ecoleId: string) {
    const term = await getCurrentTerm(this.prisma, ecoleId);
    const classe = await this.prisma.classe.findFirstOrThrow({
      where: { id: classeId, ecoleId },
      include: { professeurPrincipal: { select: { nom: true } } },
    });

    const [students, averages] = await Promise.all([
      this.prisma.student.findMany({
        where: { classeId },
        include: {
          guardians: { include: { guardian: true }, take: 1 },
          attendances: { where: { type: "ABSENT" }, select: { id: true } },
        },
        orderBy: { nom: "asc" },
      }),
      computeClassGeneralAverages(this.prisma, classeId, term.id),
    ]);

    const roster = students.map((s) => {
      const avg = averages.get(s.id);
      const tuteur = s.guardians[0]?.guardian;
      return {
        studentId: s.id,
        matricule: s.matricule,
        nom: s.nom,
        prenom: s.prenom,
        moyenne: avg?.average ?? null,
        rang: avg?.rank ?? null,
        absences: s.attendances.length,
        tuteur: tuteur ? { nom: tuteur.nom, telephone: tuteur.telephoneE164 } : null,
      };
    });

    return {
      id: classe.id,
      nom: classe.nom,
      niveau: classe.niveau,
      professeurPrincipal: classe.professeurPrincipal?.nom ?? null,
      effectif: students.length,
      roster,
    };
  }

  async getSubjects(classeId: string, ecoleId: string) {
    await this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId } });
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { classeId },
      include: { subject: true, teacher: true },
      orderBy: { subject: { nom: "asc" } },
    });
    return assignments.map((a) => ({
      subjectId: a.subjectId,
      nom: a.subject.nom,
      coefficient: a.coefficient,
      teacherId: a.teacherId,
      enseignant: a.teacher.nom,
    }));
  }
}
