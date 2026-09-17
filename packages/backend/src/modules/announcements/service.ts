import type { CreateAnnouncementInput } from "@orokia/shared";
import type { Db } from "../../lib/tenant-context.js";

export class AnnouncementsService {
  constructor(private prisma: Db) {}

  async list(ecoleId: string) {
    const announcements = await this.prisma.announcement.findMany({
      where: { ecoleId },
      orderBy: { createdAt: "desc" },
      include: { auteur: { include: { teacher: true } } },
    });
    return announcements.map((a) => ({
      id: a.id,
      titre: a.titre,
      corps: a.corps,
      cible: typeof a.cible === "string" ? a.cible : JSON.stringify(a.cible),
      statut: a.statut,
      createdAt: a.createdAt,
      publieAt: a.publieAt,
    }));
  }

  async create(ecoleId: string, input: CreateAnnouncementInput, authorProfileId: string) {
    return this.prisma.announcement.create({
      data: {
        ecoleId,
        titre: input.titre,
        corps: input.corps,
        cible: input.cible,
        statut: input.statut,
        programmeAt: input.programmeAt ? new Date(input.programmeAt) : null,
        publieAt: input.statut === "PUBLIEE" ? new Date() : null,
        auteurProfileId: authorProfileId,
      },
    });
  }
}
