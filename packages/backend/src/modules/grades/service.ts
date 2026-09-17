import { getBareme, type Role } from "@orokia/shared";
import type { GradeEntryInput, GradeCorrectionInput } from "@orokia/shared";
import { computeSubjectAverage } from "../../lib/grading.js";
import { computeClassGeneralAverages } from "../../lib/grade-aggregation.js";
import { generateReportCardVerificationId } from "../../lib/verification-id.js";
import { recordAudit } from "../../lib/audit.js";
import { getCurrentTerm } from "../../lib/term.js";
import { ApiError } from "../../plugins/error-handler.js";
import type { Db } from "../../lib/tenant-context.js";

interface Actor {
  profileId: string;
  role: Role;
  ecoleId: string;
}

export class GradesService {
  constructor(private prisma: Db) {}

  async getGrid(classeId: string, subjectId: string, ecoleId: string, termId?: string) {
    const term = termId
      ? await this.prisma.term.findFirstOrThrow({ where: { id: termId, ecoleId } })
      : await getCurrentTerm(this.prisma, ecoleId);
    const [classe, subject, students, grades] = await Promise.all([
      this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId } }),
      this.prisma.subject.findFirstOrThrow({ where: { id: subjectId, ecoleId } }),
      this.prisma.student.findMany({ where: { classeId }, orderBy: { nom: "asc" } }),
      this.prisma.grade.findMany({ where: { classeId, subjectId, termId: term.id } }),
    ]);

    const gradeByStudent = new Map(grades.map((g) => [g.studentId, g]));
    const bareme = getBareme(classe.niveau);

    return {
      classe: { id: classe.id, nom: classe.nom, niveau: classe.niveau, bareme },
      subject: { id: subject.id, nom: subject.nom },
      term: { id: term.id, numero: term.numero, statut: term.statut },
      rows: students.map((s) => {
        const g = gradeByStudent.get(s.id);
        return {
          studentId: s.id,
          matricule: s.matricule,
          nom: s.nom,
          prenom: s.prenom,
          gradeId: g?.id ?? null,
          devoir1: g?.devoir1 === undefined || g?.devoir1 === null ? null : Number(g.devoir1),
          devoir2: g?.devoir2 === undefined || g?.devoir2 === null ? null : Number(g.devoir2),
          composition: g?.composition === undefined || g?.composition === null ? null : Number(g.composition),
          average: g?.average === undefined || g?.average === null ? null : Number(g.average),
        };
      }),
    };
  }

  async saveGrid(classeId: string, subjectId: string, entries: GradeEntryInput[], actor: Actor) {
    const [classe, term] = await Promise.all([
      this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId: actor.ecoleId } }),
      getCurrentTerm(this.prisma, actor.ecoleId),
    ]);

    if (term.statut === "CLOTUREE") {
      throw new ApiError(409, "TERM_CLOSED", "Ce trimestre est clôturé. Utilisez une demande de correction.");
    }

    if (actor.role === "ENSEIGNANT") {
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: { classeId, subjectId, teacherProfileId: actor.profileId },
      });
      if (!assignment) {
        throw new ApiError(403, "NOT_ASSIGNED", "Vous n'enseignez pas cette matière dans cette classe.");
      }
    }

    const bareme = getBareme(classe.niveau);
    for (const entry of entries) {
      for (const value of [entry.devoir1, entry.devoir2, entry.composition]) {
        if (value !== null && (value < 0 || value > bareme)) {
          throw new ApiError(400, "GRADE_OUT_OF_RANGE", `Les notes doivent être comprises entre 0 et ${bareme}.`);
        }
      }
    }

    const saved = await Promise.all(
      entries.map((entry) => {
        const average = computeSubjectAverage(entry.devoir1, entry.devoir2, entry.composition);
        return this.prisma.grade.upsert({
          where: { studentId_subjectId_termId: { studentId: entry.studentId, subjectId, termId: term.id } },
          create: {
            studentId: entry.studentId,
            subjectId,
            classeId,
            termId: term.id,
            devoir1: entry.devoir1,
            devoir2: entry.devoir2,
            composition: entry.composition,
            average,
          },
          update: {
            devoir1: entry.devoir1,
            devoir2: entry.devoir2,
            composition: entry.composition,
            average,
          },
        });
      }),
    );

    return saved.length;
  }

  async correctGrade(gradeId: string, patch: GradeCorrectionInput, actor: Actor) {
    const grade = await this.prisma.grade.findFirstOrThrow({
      where: { id: gradeId, classe: { ecoleId: actor.ecoleId } },
      include: { classe: true },
    });
    const term = await this.prisma.term.findUniqueOrThrow({ where: { id: grade.termId } });

    if (term.statut !== "CLOTUREE") {
      throw new ApiError(400, "TERM_NOT_CLOSED", "La correction ne s'applique qu'à un trimestre clôturé — modifiez la note directement.");
    }

    const bareme = getBareme(grade.classe.niveau);
    const nextDevoir1 = patch.devoir1 !== undefined ? patch.devoir1 : grade.devoir1 === null ? null : Number(grade.devoir1);
    const nextDevoir2 = patch.devoir2 !== undefined ? patch.devoir2 : grade.devoir2 === null ? null : Number(grade.devoir2);
    const nextComposition =
      patch.composition !== undefined ? patch.composition : grade.composition === null ? null : Number(grade.composition);

    for (const value of [nextDevoir1, nextDevoir2, nextComposition]) {
      if (value !== null && (value < 0 || value > bareme)) {
        throw new ApiError(400, "GRADE_OUT_OF_RANGE", `Les notes doivent être comprises entre 0 et ${bareme}.`);
      }
    }

    const nextAverage = computeSubjectAverage(nextDevoir1, nextDevoir2, nextComposition);

    const before = {
      devoir1: grade.devoir1 === null ? null : Number(grade.devoir1),
      devoir2: grade.devoir2 === null ? null : Number(grade.devoir2),
      composition: grade.composition === null ? null : Number(grade.composition),
      average: grade.average === null ? null : Number(grade.average),
    };
    const after = { devoir1: nextDevoir1, devoir2: nextDevoir2, composition: nextComposition, average: nextAverage };

    const updated = await this.prisma.grade.update({
      where: { id: gradeId },
      data: { devoir1: nextDevoir1, devoir2: nextDevoir2, composition: nextComposition, average: nextAverage },
    });
    await recordAudit(this.prisma, {
      ecoleId: actor.ecoleId,
      actorProfileId: actor.profileId,
      action: "GRADE_CORRECTION",
      entityType: "Grade",
      entityId: gradeId,
      before,
      after,
      motif: patch.motif,
    });

    return updated;
  }

  async publishTerm(termId: string, actor: Actor) {
    if (actor.role !== "DIRECTION") {
      throw new ApiError(403, "FORBIDDEN", "Seule la direction peut publier un trimestre.");
    }

    const term = await this.prisma.term.findFirstOrThrow({ where: { id: termId, ecoleId: actor.ecoleId } });
    if (term.statut === "CLOTUREE") {
      throw new ApiError(409, "TERM_ALREADY_CLOSED", "Ce trimestre est déjà clôturé.");
    }

    const classes = await this.prisma.classe.findMany({ where: { ecoleId: term.ecoleId } });
    let reportCardsCreated = 0;

    for (const classe of classes) {
      const [students, assignments] = await Promise.all([
        this.prisma.student.findMany({ where: { classeId: classe.id } }),
        this.prisma.teacherAssignment.findMany({ where: { classeId: classe.id }, include: { subject: true } }),
      ]);
      const averages = await computeClassGeneralAverages(this.prisma, classe.id, term.id);
      const classAverages = [...averages.values()].map((a) => a.average).filter((v): v is number => v !== null);
      const moyenneDeClasse =
        classAverages.length > 0 ? Math.round((classAverages.reduce((a, b) => a + b, 0) / classAverages.length) * 100) / 100 : null;

      for (const student of students) {
        const own = averages.get(student.id);
        const grades = await this.prisma.grade.findMany({ where: { studentId: student.id, termId: term.id } });
        const gradeBySubject = new Map(grades.map((g) => [g.subjectId, g]));

        const reportCard = await this.prisma.reportCard.create({
          data: {
            studentId: student.id,
            termId: term.id,
            generalAverage: own?.average ?? null,
            rank: own?.rank ?? null,
            nonClasse: own?.average === null,
            moyenneDeClasse,
            verificationId: generateReportCardVerificationId(term.anneeScolaire, term.numero, student.matricule),
            lignes: {
              create: assignments.map((a) => {
                const g = gradeBySubject.get(a.subjectId);
                return {
                  subjectNom: a.subject.nom,
                  coefficient: a.coefficient,
                  devoir1: g?.devoir1 ?? null,
                  devoir2: g?.devoir2 ?? null,
                  composition: g?.composition ?? null,
                  average: g?.average ?? null,
                  appreciation: g?.appreciation ?? null,
                };
              }),
            },
          },
        });
        reportCardsCreated++;
        await recordAudit(this.prisma, {
          ecoleId: actor.ecoleId,
          actorProfileId: actor.profileId,
          action: "REPORT_CARD_PUBLISHED",
          entityType: "ReportCard",
          entityId: reportCard.id,
        });
      }
    }

    await this.prisma.term.update({ where: { id: termId }, data: { statut: "CLOTUREE", clotureAt: new Date() } });

    return { reportCardsCreated };
  }

  async getReportCard(studentId: string, ecoleId: string, termId?: string) {
    await this.prisma.student.findFirstOrThrow({ where: { id: studentId, ecoleId } });
    const term = termId
      ? await this.prisma.term.findFirstOrThrow({ where: { id: termId, ecoleId } })
      : await getCurrentTerm(this.prisma, ecoleId);

    const reportCard = await this.prisma.reportCard.findUnique({
      where: { studentId_termId: { studentId, termId: term.id } },
      include: { lignes: true, student: { include: { classe: true } } },
    });

    if (!reportCard) {
      throw new ApiError(404, "REPORT_CARD_NOT_FOUND", "Aucun bulletin publié pour ce trimestre.");
    }

    return {
      verificationId: reportCard.verificationId,
      publishedAt: reportCard.publishedAt,
      eleve: {
        nom: reportCard.student.nom,
        prenom: reportCard.student.prenom,
        matricule: reportCard.student.matricule,
        classe: reportCard.student.classe.nom,
      },
      terme: { numero: term.numero, anneeScolaire: term.anneeScolaire },
      generalAverage: reportCard.generalAverage === null ? null : Number(reportCard.generalAverage),
      rank: reportCard.rank,
      nonClasse: reportCard.nonClasse,
      moyenneDeClasse: reportCard.moyenneDeClasse === null ? null : Number(reportCard.moyenneDeClasse),
      lignes: reportCard.lignes.map((l) => ({
        matiere: l.subjectNom,
        coefficient: l.coefficient,
        devoir1: l.devoir1 === null ? null : Number(l.devoir1),
        devoir2: l.devoir2 === null ? null : Number(l.devoir2),
        composition: l.composition === null ? null : Number(l.composition),
        moyenne: l.average === null ? null : Number(l.average),
      })),
    };
  }
}
