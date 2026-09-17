import { round2 } from "@orokia/shared";
import { computeClassGeneralAverages } from "../../lib/grade-aggregation.js";
import { getCurrentTerm } from "../../lib/term.js";
import type { Db } from "../../lib/tenant-context.js";

const NIVEAUX = ["PRIMAIRE", "COLLEGE", "LYCEE"] as const;

export class ReportsService {
  constructor(private prisma: Db) {}

  async getDashboardSummary(ecoleId: string) {
    const term = await getCurrentTerm(this.prisma, ecoleId);

    const [effectifTotal, enseignantsCount, classes] = await Promise.all([
      this.prisma.student.count({ where: { ecoleId } }),
      this.prisma.teacher.count({ where: { ecoleId } }),
      this.prisma.classe.findMany({ where: { ecoleId }, select: { id: true, niveau: true } }),
    ]);
    const classeIds = classes.map((c) => c.id);

    const averagesByClasse = await Promise.all(
      classes.map(async (c) => ({
        classeId: c.id,
        niveau: c.niveau,
        averages: [...(await computeClassGeneralAverages(this.prisma, c.id, term.id)).values()]
          .map((a) => a.average)
          .filter((v): v is number => v !== null),
      })),
    );

    const allAverages = averagesByClasse.flatMap((c) => c.averages);
    const moyenneGenerale = allAverages.length > 0 ? round2(allAverages.reduce((a, b) => a + b, 0) / allAverages.length) : null;

    const moyenneParNiveau = NIVEAUX.map((niveau) => {
      const values = averagesByClasse.filter((c) => c.niveau === niveau).flatMap((c) => c.averages);
      const effectif = classes.filter((c) => c.niveau === niveau).length;
      return {
        niveau,
        moyenne: values.length > 0 ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null,
        classesCount: effectif,
      };
    });

    const attendances = await this.prisma.attendance.findMany({
      where: { classeId: { in: classeIds } },
      select: { type: true, date: true, justificatif: true },
    });
    const totalAttendance = attendances.length;
    const presentCount = attendances.filter((a) => a.type === "PRESENT" || a.type === "RETARD").length;
    const tauxPresence = totalAttendance > 0 ? round2((presentCount / totalAttendance) * 100) : null;

    const absencesATraiter = attendances.filter((a) => a.type === "ABSENT" && !a.justificatif).length;

    const byDate = new Map<string, { present: number; total: number }>();
    for (const a of attendances) {
      const key = a.date.toISOString().slice(0, 10);
      const bucket = byDate.get(key) ?? { present: 0, total: 0 };
      bucket.total += 1;
      if (a.type === "PRESENT" || a.type === "RETARD") bucket.present += 1;
      byDate.set(key, bucket);
    }
    const presenceParJour = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { present, total }]) => ({ date, taux: round2((present / total) * 100) }));

    return {
      effectifTotal,
      enseignantsCount,
      classesCount: classes.length,
      moyenneGenerale,
      tauxPresence,
      absencesATraiter,
      moyenneParNiveau,
      presenceParJour,
    };
  }

  async getNiveauStats(ecoleId: string) {
    const term = await getCurrentTerm(this.prisma, ecoleId);
    const classes = await this.prisma.classe.findMany({ where: { ecoleId }, select: { id: true, niveau: true } });

    return Promise.all(
      NIVEAUX.map(async (niveau) => {
        const classeIds = classes.filter((c) => c.niveau === niveau).map((c) => c.id);
        const effectif = await this.prisma.student.count({ where: { classeId: { in: classeIds } } });

        const averagesPerClasse = await Promise.all(
          classeIds.map((id) => computeClassGeneralAverages(this.prisma, id, term.id)),
        );
        const values = averagesPerClasse.flatMap((m) => [...m.values()].map((a) => a.average)).filter((v): v is number => v !== null);
        const moyenne = values.length > 0 ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null;

        const attendances = await this.prisma.attendance.findMany({
          where: { classeId: { in: classeIds } },
          select: { type: true },
        });
        const totalAtt = attendances.length;
        const presentAtt = attendances.filter((a) => a.type === "PRESENT" || a.type === "RETARD").length;
        const presence = totalAtt > 0 ? round2((presentAtt / totalAtt) * 100) : null;

        return { niveau, effectif, classesCount: classeIds.length, moyenne, presence };
      }),
    );
  }
}
