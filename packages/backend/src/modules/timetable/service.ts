import { Prisma } from "@prisma/client";
import type { CreateTimetableSlotInput } from "@orokia/shared";
import { recomputeConflictsForDay } from "../../lib/timetable.js";
import { ApiError } from "../../plugins/error-handler.js";
import type { Db } from "../../lib/tenant-context.js";

export class TimetableService {
  constructor(private prisma: Db) {}

  async getForClasse(classeId: string, ecoleId?: string) {
    if (ecoleId) await this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId } });
    const slots = await this.prisma.timetableSlot.findMany({
      where: { classeId },
      include: { subject: true, teacher: true },
      orderBy: [{ jour: "asc" }, { heureDebut: "asc" }],
    });
    return slots.map((s) => ({
      id: s.id,
      jour: s.jour,
      heureDebut: s.heureDebut,
      dureeMinutes: s.dureeMinutes,
      salle: s.salle,
      etat: s.etat,
      matiere: s.subject.nom,
      enseignant: s.teacher.nom,
    }));
  }

  async createSlot(classeId: string, ecoleId: string, input: CreateTimetableSlotInput) {
    const classe = await this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId } });

    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: { classeId, subjectId: input.subjectId, teacherId: input.teacherId },
    });
    if (!assignment) {
      throw new ApiError(400, "NOT_ASSIGNED", "Cet enseignant n'est pas affecté à cette matière dans cette classe.");
    }

    const slot = await this.prisma.timetableSlot.create({
      data: {
        classeId,
        subjectId: input.subjectId,
        teacherId: input.teacherId,
        jour: input.jour,
        heureDebut: input.heureDebut,
        dureeMinutes: input.dureeMinutes,
        salle: input.salle,
        anneeScolaire: classe.anneeScolaire,
      },
    });

    const conflicts = await recomputeConflictsForDay(this.prisma, classe.anneeScolaire, input.jour);
    const refreshed = await this.prisma.timetableSlot.findUniqueOrThrow({ where: { id: slot.id } });

    return { slot: refreshed, conflictsOnDay: conflicts };
  }

  async deleteSlot(slotId: string, ecoleId: string) {
    const slot = await this.prisma.timetableSlot.findFirstOrThrow({ where: { id: slotId, classe: { ecoleId } } });
    try {
      await this.prisma.timetableSlot.delete({ where: { id: slotId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(409, "SLOT_IN_USE", "Ce créneau a des présences enregistrées et ne peut pas être supprimé.");
      }
      throw err;
    }
    await recomputeConflictsForDay(this.prisma, slot.anneeScolaire, slot.jour);
  }
}
