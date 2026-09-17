import type { SaveAttendanceInput } from "@orokia/shared";
import type { Db } from "../../lib/tenant-context.js";

export class AttendanceService {
  constructor(private prisma: Db) {}

  async getSession(classeId: string, sessionId: string, date: string, ecoleId: string) {
    await this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId } });
    const [students, records, session] = await Promise.all([
      this.prisma.student.findMany({ where: { classeId }, orderBy: { nom: "asc" } }),
      this.prisma.attendance.findMany({ where: { classeId, sessionId, date: new Date(date) } }),
      this.prisma.timetableSlot.findUniqueOrThrow({ where: { id: sessionId }, include: { subject: true } }),
    ]);

    const byStudent = new Map(records.map((r) => [r.studentId, r]));

    return {
      session: { id: session.id, heureDebut: session.heureDebut, matiere: session.subject.nom },
      rows: students.map((s) => {
        const r = byStudent.get(s.id);
        return {
          studentId: s.id,
          matricule: s.matricule,
          nom: s.nom,
          prenom: s.prenom,
          type: r?.type ?? "PRESENT",
          justificatif: r?.justificatif ?? null,
        };
      }),
    };
  }

  /** Upsert idempotent sur (studentId, sessionId, date) — rejouer le même payload ne crée pas de doublons. */
  async saveBulk(classeId: string, ecoleId: string, input: SaveAttendanceInput, actorProfileId: string) {
    await this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId } });
    const date = new Date(input.date);
    const saved = await Promise.all(
      input.entries.map((entry) =>
        this.prisma.attendance.upsert({
          where: { studentId_sessionId_date: { studentId: entry.studentId, sessionId: input.sessionId, date } },
          create: {
            studentId: entry.studentId,
            classeId,
            sessionId: input.sessionId,
            date,
            type: entry.type,
            justificatif: entry.justificatif ?? null,
            saisiParProfileId: actorProfileId,
          },
          update: {
            type: entry.type,
            justificatif: entry.justificatif ?? null,
            saisiParProfileId: actorProfileId,
          },
        }),
      ),
    );
    return saved.length;
  }

  /**
   * Job d'escalade : toute absence non justifiée vieille de plus de 48h sans
   * escalade déjà déclenchée génère un EscalationEvent (destinataires :
   * tuteurs + censeur) et appelle un dispatcher de notification stubé.
   * Scanne volontairement toutes les écoles (job système, pas de requête HTTP) —
   * doit être appelé via `withRlsBypass` une fois câblé à un cron.
   */
  async checkEscalations(): Promise<number> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const candidates = await this.prisma.attendance.findMany({
      where: { type: "ABSENT", justificatif: null, date: { lt: cutoff }, escalation: null },
      include: { student: { include: { guardians: { include: { guardian: true } } } } },
    });

    for (const a of candidates) {
      const destinataires = a.student.guardians.map((gs) => gs.guardian.telephoneE164).concat(["censeur"]);
      await this.prisma.escalationEvent.create({
        data: { attendanceId: a.id, destinataires, statut: "NOTIFIE", escalatedAt: new Date() },
      });
      console.log(`[ESCALADE] Absence non justifiée > 48h — élève ${a.studentId} — notification (stub) à`, destinataires);
    }

    return candidates.length;
  }
}
