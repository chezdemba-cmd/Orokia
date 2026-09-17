import { computeClassGeneralAverages } from "../../lib/grade-aggregation.js";
import { getCurrentTerm } from "../../lib/term.js";
import type { Db } from "../../lib/tenant-context.js";

export class StudentsService {
  constructor(private prisma: Db) {}

  async getDetail(studentId: string, ecoleId: string) {
    const term = await getCurrentTerm(this.prisma, ecoleId);

    const student = await this.prisma.student.findFirstOrThrow({
      where: { id: studentId, ecoleId },
      include: {
        classe: true,
        guardians: { include: { guardian: true } },
      },
    });

    const [grades, averages, absences, retards] = await Promise.all([
      this.prisma.grade.findMany({
        where: { studentId, termId: term.id },
        include: { subject: true },
      }),
      computeClassGeneralAverages(this.prisma, student.classeId, term.id),
      this.prisma.attendance.count({ where: { studentId, type: "ABSENT" } }),
      this.prisma.attendance.count({ where: { studentId, type: "RETARD" } }),
    ]);

    const own = averages.get(studentId);

    return {
      id: student.id,
      matricule: student.matricule,
      nom: student.nom,
      prenom: student.prenom,
      dateNaissance: student.dateNaissance,
      dateInscription: student.dateInscription,
      classe: { id: student.classe.id, nom: student.classe.nom, niveau: student.classe.niveau },
      moyenneGenerale: own?.average ?? null,
      rang: own?.rank ?? null,
      absences,
      retards,
      matieres: grades
        .map((g) => ({
          subjectId: g.subjectId,
          nom: g.subject.nom,
          devoir1: g.devoir1 === null ? null : Number(g.devoir1),
          devoir2: g.devoir2 === null ? null : Number(g.devoir2),
          composition: g.composition === null ? null : Number(g.composition),
          moyenne: g.average === null ? null : Number(g.average),
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom)),
      tuteurs: student.guardians.map((gs) => ({
        nom: gs.guardian.nom,
        lien: gs.guardian.lien,
        telephone: gs.guardian.telephoneE164,
        canalPrefere: gs.guardian.canalPrefere,
      })),
    };
  }
}
