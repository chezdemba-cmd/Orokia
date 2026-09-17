import type { CreateClassLogInput } from "@orokia/shared";
import { ApiError } from "../../plugins/error-handler.js";
import type { Db } from "../../lib/tenant-context.js";

export class ClassLogService {
  constructor(private prisma: Db) {}

  async listForClasse(classeId: string, ecoleId: string) {
    await this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId } });
    const logs = await this.prisma.classLog.findMany({
      where: { classeId },
      include: { subject: true, teacher: true, devoirs: true, acks: true },
      orderBy: { date: "desc" },
    });
    const effectif = await this.prisma.student.count({ where: { classeId } });

    return logs.map((l) => ({
      id: l.id,
      date: l.date,
      titre: l.titre,
      contenu: l.contenu,
      matiere: l.subject.nom,
      enseignant: l.teacher.nom,
      devoir: l.devoirs[0] ? { consigne: l.devoirs[0].consigne, echeance: l.devoirs[0].echeance } : null,
      signatures: { signes: l.acks.length, total: effectif },
    }));
  }

  async create(classeId: string, ecoleId: string, input: CreateClassLogInput, teacherProfileId: string) {
    await this.prisma.classe.findFirstOrThrow({ where: { id: classeId, ecoleId } });
    const teacher = await this.prisma.teacher.findUnique({ where: { profileId: teacherProfileId } });
    if (!teacher) {
      throw new ApiError(403, "NOT_A_TEACHER", "Seul un enseignant peut ajouter une séance au cahier de texte.");
    }

    return this.prisma.classLog.create({
      data: {
        classeId,
        subjectId: input.subjectId,
        teacherId: teacher.id,
        date: new Date(input.date),
        titre: input.titre,
        contenu: input.contenu,
        devoirs: input.devoir
          ? { create: { consigne: input.devoir.consigne, echeance: new Date(input.devoir.echeance) } }
          : undefined,
      },
    });
  }
}
