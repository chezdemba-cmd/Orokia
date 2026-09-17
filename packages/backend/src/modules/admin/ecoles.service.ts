import { hash as argon2Hash } from "@node-rs/argon2";
import type { CreateEcoleInput } from "@orokia/shared";
import { ApiError } from "../../plugins/error-handler.js";
import type { Db } from "../../lib/tenant-context.js";

export class AdminEcolesService {
  constructor(private prisma: Db) {}

  async list() {
    const ecoles = await this.prisma.ecole.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { students: true, teachers: true, classes: true } } },
    });

    return ecoles.map((e) => ({
      id: e.id,
      nom: e.nom,
      adresse: e.adresse,
      telephone: e.telephone,
      anneeScolaireActive: e.anneeScolaireActive,
      createdAt: e.createdAt,
      effectifEleves: e._count.students,
      effectifEnseignants: e._count.teachers,
      nombreClasses: e._count.classes,
    }));
  }

  async create(input: CreateEcoleInput) {
    const existing = await this.prisma.account.findUnique({ where: { telephoneE164: input.direction.telephone } });
    if (existing) {
      throw new ApiError(409, "PHONE_ALREADY_USED", "Ce numéro de téléphone est déjà associé à un compte.");
    }

    const passwordHash = await argon2Hash(input.direction.motDePasse);

    const ecole = await this.prisma.ecole.create({
      data: {
        nom: input.nom,
        adresse: input.adresse,
        telephone: input.telephone ?? null,
        anneeScolaireActive: input.anneeScolaireActive,
      },
    });

    await Promise.all(
      [1, 2, 3].map((numero) =>
        this.prisma.term.create({ data: { ecoleId: ecole.id, numero, anneeScolaire: input.anneeScolaireActive, statut: "OUVERTE" } }),
      ),
    );

    const directionAccount = await this.prisma.account.create({
      data: { telephoneE164: input.direction.telephone, passwordHash, twoFactorEnabled: true },
    });
    await this.prisma.profile.create({ data: { accountId: directionAccount.id, ecoleId: ecole.id, role: "DIRECTION" } });

    const result = { ecole, directionTelephone: directionAccount.telephoneE164 };

    return {
      id: result.ecole.id,
      nom: result.ecole.nom,
      adresse: result.ecole.adresse,
      telephone: result.ecole.telephone,
      anneeScolaireActive: result.ecole.anneeScolaireActive,
      createdAt: result.ecole.createdAt,
      effectifEleves: 0,
      effectifEnseignants: 0,
      nombreClasses: 0,
      directionTelephone: result.directionTelephone,
    };
  }
}
