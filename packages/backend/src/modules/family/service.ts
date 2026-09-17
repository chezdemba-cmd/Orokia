import { computeClassGeneralAverages } from "../../lib/grade-aggregation.js";
import { getCurrentTerm } from "../../lib/term.js";
import { recordAudit } from "../../lib/audit.js";
import { ApiError } from "../../plugins/error-handler.js";
import { StudentsService } from "../students/service.js";
import { TimetableService } from "../timetable/service.js";
import type { Db } from "../../lib/tenant-context.js";

export class FamilyService {
  private studentsService: StudentsService;
  private timetableService: TimetableService;

  constructor(private prisma: Db) {
    this.studentsService = new StudentsService(prisma);
    this.timetableService = new TimetableService(prisma);
  }

  // --- Résolution d'identité ---

  private async resolveGuardian(profileId: string) {
    const guardian = await this.prisma.guardian.findUnique({ where: { profileId } });
    if (!guardian) throw new ApiError(404, "GUARDIAN_NOT_FOUND", "Aucun profil parent associé à ce compte.");
    return guardian;
  }

  /** 404 (pas 403) si l'élève n'appartient pas à l'école de l'appelant — ne révèle pas son existence ailleurs. */
  private async assertGuardianOwnsStudent(guardianId: string, studentId: string, ecoleId: string) {
    await this.prisma.student.findFirstOrThrow({ where: { id: studentId, ecoleId } });
    const link = await this.prisma.guardianStudent.findUnique({ where: { guardianId_studentId: { guardianId, studentId } } });
    if (!link) throw new ApiError(403, "NOT_YOUR_CHILD", "Cet élève n'est pas rattaché à votre profil.");
  }

  private async resolveOwnStudent(profileId: string, ecoleId: string) {
    const student = await this.prisma.student.findFirst({ where: { profileId, ecoleId } });
    if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "Aucun profil élève associé à ce compte.");
    return student;
  }

  // --- Parent ---

  async getFamily(profileId: string, ecoleId: string) {
    const guardian = await this.prisma.guardian.findUniqueOrThrow({
      where: { profileId },
      include: { students: { where: { student: { ecoleId } }, include: { student: { include: { classe: true } } } } },
    });
    const term = await getCurrentTerm(this.prisma, ecoleId);

    return Promise.all(
      guardian.students.map(async (gs) => {
        const s = gs.student;
        const averages = await computeClassGeneralAverages(this.prisma, s.classeId, term.id);
        const own = averages.get(s.id);
        return {
          studentId: s.id,
          matricule: s.matricule,
          nom: s.nom,
          prenom: s.prenom,
          classe: s.classe.nom,
          moyenneGenerale: own?.average ?? null,
          rang: own?.rank ?? null,
        };
      }),
    );
  }

  async getChildAccueil(profileId: string, studentId: string, ecoleId: string) {
    const guardian = await this.resolveGuardian(profileId);
    await this.assertGuardianOwnsStudent(guardian.id, studentId, ecoleId);
    return this.buildAccueil(studentId, ecoleId);
  }

  async getSelfAccueil(profileId: string, ecoleId: string) {
    const student = await this.resolveOwnStudent(profileId, ecoleId);
    return this.buildAccueil(student.id, ecoleId);
  }

  private async buildAccueil(studentId: string, ecoleId: string) {
    const term = await getCurrentTerm(this.prisma, ecoleId);
    const student = await this.prisma.student.findFirstOrThrow({ where: { id: studentId, ecoleId }, include: { classe: true } });

    const [recentGrades, nextDevoir, unjustifiedAbsences] = await Promise.all([
      this.prisma.grade.findMany({
        where: { studentId, termId: term.id, average: { not: null } },
        include: { subject: true },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }),
      this.prisma.devoir.findFirst({
        where: { classLog: { classeId: student.classeId }, echeance: { gte: new Date() } },
        include: { classLog: { include: { subject: true } } },
        orderBy: { echeance: "asc" },
      }),
      this.prisma.attendance.count({ where: { studentId, type: "ABSENT", justificatif: null } }),
    ]);

    return {
      eleve: { id: student.id, nom: student.nom, prenom: student.prenom, classe: student.classe.nom },
      dernieresNotes: recentGrades.map((g) => ({ matiere: g.subject.nom, moyenne: g.average === null ? null : Number(g.average) })),
      prochainDevoir: nextDevoir ? { matiere: nextDevoir.classLog.subject.nom, consigne: nextDevoir.consigne, echeance: nextDevoir.echeance } : null,
      absencesNonJustifiees: unjustifiedAbsences,
    };
  }

  async getChildSchedule(profileId: string, studentId: string, ecoleId: string) {
    const guardian = await this.resolveGuardian(profileId);
    await this.assertGuardianOwnsStudent(guardian.id, studentId, ecoleId);
    const student = await this.prisma.student.findFirstOrThrow({ where: { id: studentId, ecoleId } });
    return this.timetableService.getForClasse(student.classeId);
  }

  async getSelfSchedule(profileId: string, ecoleId: string) {
    const student = await this.resolveOwnStudent(profileId, ecoleId);
    return this.timetableService.getForClasse(student.classeId);
  }

  async getChildGrades(profileId: string, studentId: string, ecoleId: string) {
    const guardian = await this.resolveGuardian(profileId);
    await this.assertGuardianOwnsStudent(guardian.id, studentId, ecoleId);
    return this.studentsService.getDetail(studentId, ecoleId);
  }

  async getSelfGrades(profileId: string, ecoleId: string) {
    const student = await this.resolveOwnStudent(profileId, ecoleId);
    return this.studentsService.getDetail(student.id, ecoleId);
  }

  async getChildAttendance(profileId: string, studentId: string, ecoleId: string) {
    const guardian = await this.resolveGuardian(profileId);
    await this.assertGuardianOwnsStudent(guardian.id, studentId, ecoleId);
    return this.listAttendance(studentId);
  }

  private async listAttendance(studentId: string) {
    const rows = await this.prisma.attendance.findMany({
      where: { studentId, type: { in: ["ABSENT", "RETARD"] } },
      orderBy: { date: "desc" },
      take: 30,
    });
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      type: r.type,
      justificatif: r.justificatif,
    }));
  }

  async justifyAbsence(profileId: string, studentId: string, attendanceId: string, motif: string, ecoleId: string, actorProfileId: string) {
    const guardian = await this.resolveGuardian(profileId);
    await this.assertGuardianOwnsStudent(guardian.id, studentId, ecoleId);
    const attendance = await this.prisma.attendance.findUniqueOrThrow({ where: { id: attendanceId } });
    if (attendance.studentId !== studentId) {
      throw new ApiError(403, "NOT_YOUR_CHILD", "Cette absence ne concerne pas cet élève.");
    }

    const updated = await this.prisma.attendance.update({ where: { id: attendanceId }, data: { justificatif: motif } });
    await recordAudit(this.prisma, {
      ecoleId,
      actorProfileId,
      action: "ABSENCE_JUSTIFIED_BY_PARENT",
      entityType: "Attendance",
      entityId: attendanceId,
      motif,
    });

    return updated;
  }

  // --- Élève ---

  async getSelfHomework(profileId: string, ecoleId: string) {
    const student = await this.resolveOwnStudent(profileId, ecoleId);
    const devoirs = await this.prisma.devoir.findMany({
      where: { classLog: { classeId: student.classeId } },
      include: { classLog: { include: { subject: true } } },
      orderBy: { echeance: "asc" },
    });
    return devoirs.map((d) => ({
      id: d.id,
      matiere: d.classLog.subject.nom,
      consigne: d.consigne,
      echeance: d.echeance,
      statut: d.statut,
    }));
  }
}
