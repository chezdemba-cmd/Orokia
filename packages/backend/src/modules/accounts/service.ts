import { recordAudit } from "../../lib/audit.js";
import { ApiError } from "../../plugins/error-handler.js";
import type { Db } from "../../lib/tenant-context.js";

export class AccountsService {
  constructor(private prisma: Db) {}

  async list(ecoleId: string) {
    const profiles = await this.prisma.profile.findMany({
      where: { ecoleId },
      include: { account: true, teacher: true },
      orderBy: { account: { telephoneE164: "asc" } },
    });

    return profiles.map((p) => ({
      profileId: p.id,
      telephone: p.account.telephoneE164,
      role: p.role,
      nom: p.teacher?.nom ?? null,
      etat: p.etat,
      twoFactorEnabled: p.account.twoFactorEnabled,
      lastSeenAt: p.account.lastSeenAt,
    }));
  }

  async setEtat(profileId: string, ecoleId: string, etat: "ACTIF" | "SUSPENDU", actorProfileId: string) {
    if (profileId === actorProfileId) {
      throw new ApiError(400, "CANNOT_SELF_SUSPEND", "Vous ne pouvez pas modifier votre propre accès.");
    }
    const profile = await this.prisma.profile.findFirstOrThrow({ where: { id: profileId, ecoleId } });

    const updated = await this.prisma.profile.update({ where: { id: profileId }, data: { etat } });
    await recordAudit(this.prisma, {
      ecoleId,
      actorProfileId,
      action: etat === "SUSPENDU" ? "ACCOUNT_SUSPENDED" : "ACCOUNT_ACTIVATED",
      entityType: "Profile",
      entityId: profileId,
      before: { etat: profile.etat },
      after: { etat },
    });

    return updated;
  }
}
