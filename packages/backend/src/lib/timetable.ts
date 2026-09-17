import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function slotsOverlap(aStart: string, aDuration: number, bStart: string, bDuration: number): boolean {
  const aS = toMinutes(aStart);
  const aE = aS + aDuration;
  const bS = toMinutes(bStart);
  const bE = bS + bDuration;
  return aS < bE && bS < aE;
}

/**
 * Recalcule l'état CONFLIT/OK de tous les créneaux d'un jour donné, en
 * comparant chaque paire de créneaux partageant le même enseignant ou la
 * même salle. Idempotent — peut être rappelée après tout ajout/suppression.
 */
export async function recomputeConflictsForDay(prisma: DbClient, anneeScolaire: string, jour: number): Promise<number> {
  const slots = await prisma.timetableSlot.findMany({ where: { anneeScolaire, jour } });
  const conflictIds = new Set<string>();

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]!;
      const b = slots[j]!;
      const sameResource = a.teacherId === b.teacherId || a.salle === b.salle;
      if (sameResource && slotsOverlap(a.heureDebut, a.dureeMinutes, b.heureDebut, b.dureeMinutes)) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
      }
    }
  }

  await Promise.all(
    slots
      .filter((s) => (conflictIds.has(s.id) ? s.etat !== "CONFLIT" : s.etat === "CONFLIT"))
      .map((s) => prisma.timetableSlot.update({ where: { id: s.id }, data: { etat: conflictIds.has(s.id) ? "CONFLIT" : "OK" } })),
  );

  return conflictIds.size;
}
