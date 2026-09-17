import type { RecordPaymentInput } from "@orokia/shared";
import { round2 } from "@orokia/shared";
import { generateReceiptVerificationId } from "../../lib/verification-id.js";
import { ApiError } from "../../plugins/error-handler.js";
import type { Db } from "../../lib/tenant-context.js";

function etatFor(solde: number, montantDu: number): "SOLDE" | "A_JOUR" | "EN_RETARD" {
  if (solde <= 0) return "SOLDE";
  if (solde < montantDu) return "A_JOUR";
  return "EN_RETARD";
}

export class TuitionService {
  constructor(private prisma: Db) {}

  async list(ecoleId: string) {
    const fees = await this.prisma.tuitionFee.findMany({
      where: { student: { ecoleId } },
      include: { student: { include: { classe: true } }, payments: true },
      orderBy: { student: { nom: "asc" } },
    });

    return fees.map((f) => {
      const montantDu = Number(f.montantDu);
      const montantVerse = round2(f.payments.reduce((sum, p) => sum + Number(p.montant), 0));
      const solde = round2(montantDu - montantVerse);
      return {
        tuitionFeeId: f.id,
        studentId: f.studentId,
        matricule: f.student.matricule,
        nom: f.student.nom,
        prenom: f.student.prenom,
        classe: f.student.classe.nom,
        montantDu,
        montantVerse,
        solde,
        etat: etatFor(solde, montantDu),
      };
    });
  }

  async getSummary(ecoleId: string) {
    const fees = await this.list(ecoleId);
    const totalDu = round2(fees.reduce((s, f) => s + f.montantDu, 0));
    const totalVerse = round2(fees.reduce((s, f) => s + f.montantVerse, 0));
    return {
      totalDu,
      totalVerse,
      resteARecouvrer: round2(totalDu - totalVerse),
      enRetardCount: fees.filter((f) => f.etat === "EN_RETARD").length,
    };
  }

  async recordPayment(studentId: string, ecoleId: string, input: RecordPaymentInput, actorProfileId: string) {
    const ecole = await this.prisma.ecole.findUniqueOrThrow({ where: { id: ecoleId } });
    await this.prisma.student.findFirstOrThrow({ where: { id: studentId, ecoleId } });
    const fee = await this.prisma.tuitionFee.findUnique({
      where: { studentId_anneeScolaire: { studentId, anneeScolaire: ecole.anneeScolaireActive } },
      include: { payments: true },
    });
    if (!fee) throw new ApiError(404, "TUITION_FEE_NOT_FOUND", "Aucun dossier d'écolage pour cet élève.");

    const montantVerseAvant = round2(fee.payments.reduce((sum, p) => sum + Number(p.montant), 0));
    const soldeAvant = round2(Number(fee.montantDu) - montantVerseAvant);
    if (input.montant > soldeAvant) {
      throw new ApiError(400, "AMOUNT_EXCEEDS_BALANCE", `Le montant dépasse le solde restant (${soldeAvant} FCFA).`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        tuitionFeeId: fee.id,
        montant: input.montant,
        modePaiement: input.modePaiement,
        referenceTransaction: input.referenceTransaction ?? null,
        remisPar: input.remisPar,
        verificationId: generateReceiptVerificationId(),
        saisiParProfileId: actorProfileId,
      },
    });

    const student = await this.prisma.student.findUniqueOrThrow({ where: { id: studentId }, include: { classe: true } });
    const soldeApres = round2(soldeAvant - input.montant);

    return {
      recuId: payment.verificationId,
      eleve: { nom: student.nom, prenom: student.prenom, matricule: student.matricule, classe: student.classe.nom },
      objet: `Écolage ${ecole.anneeScolaireActive}`,
      montant: Number(payment.montant),
      modePaiement: payment.modePaiement,
      referenceTransaction: payment.referenceTransaction,
      remisPar: payment.remisPar,
      soldeApres,
      dateHeure: payment.datePaiement,
    };
  }

  async listReceiptsToday(ecoleId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const payments = await this.prisma.payment.findMany({
      where: { datePaiement: { gte: startOfDay }, tuitionFee: { student: { ecoleId } } },
      include: { tuitionFee: { include: { student: true } } },
      orderBy: { datePaiement: "desc" },
    });

    return payments.map((p) => ({
      verificationId: p.verificationId,
      eleve: `${p.tuitionFee.student.nom} ${p.tuitionFee.student.prenom}`,
      montant: Number(p.montant),
      modePaiement: p.modePaiement,
      dateHeure: p.datePaiement,
    }));
  }
}
