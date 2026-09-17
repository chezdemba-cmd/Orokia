import type { Prisma } from "@prisma/client";
import { round2, type GeneratePayrollInput } from "@orokia/shared";
import { computeGrossPermanent, computeGrossVacataire, computePayroll } from "../../lib/payroll.js";
import { generatePayslipVerificationId } from "../../lib/verification-id.js";
import { ApiError } from "../../plugins/error-handler.js";
import type { Db } from "../../lib/tenant-context.js";

interface PayrollDetail {
  heures: number;
  tauxHoraire: number | null;
  salaireBase: number | null;
  indemniteTransport: number;
  primeResponsabilite: number;
}

export class PayrollService {
  constructor(private prisma: Db) {}

  async getGrid(periode: string, ecoleId: string) {
    const [teachers, lines] = await Promise.all([
      this.prisma.teacher.findMany({ where: { ecoleId }, orderBy: { nom: "asc" } }),
      this.prisma.payrollLine.findMany({ where: { periode, teacher: { ecoleId } } }),
    ]);
    const lineByTeacher = new Map(lines.map((l) => [l.teacherId, l]));

    return teachers.map((t) => {
      const line = lineByTeacher.get(t.id);
      const detail = (line?.detail ?? null) as PayrollDetail | null;
      const retenues = line ? (line.retenues as unknown as { inps: number; its: number }) : null;
      return {
        teacherId: t.id,
        nom: t.nom,
        poste: t.matriculeEmploye,
        statutEmploi: t.statutEmploi,
        salaireBase: t.salaireBase === null ? null : Number(t.salaireBase),
        tauxHoraire: t.tauxHoraire === null ? null : Number(t.tauxHoraire),
        genere: !!line,
        heures: detail?.heures ?? 0,
        brut: line ? Number(line.montantBrut) : null,
        retenues: retenues ? round2(retenues.inps + retenues.its) : null,
        net: line ? Number(line.montantNet) : null,
      };
    });
  }

  async generate(input: GeneratePayrollInput, ecoleId: string, actorProfileId: string) {
    const teacherIds = input.lines.map((l) => l.teacherId);
    const teachers = await this.prisma.teacher.findMany({ where: { id: { in: teacherIds }, ecoleId } });
    const teacherById = new Map(teachers.map((t) => [t.id, t]));

    let count = 0;
    for (const lineInput of input.lines) {
      const teacher = teacherById.get(lineInput.teacherId);
      if (!teacher) continue;

      const brut =
        teacher.statutEmploi === "PERMANENT"
          ? computeGrossPermanent(Number(teacher.salaireBase ?? 0), lineInput.indemniteTransport, lineInput.primeResponsabilite)
          : computeGrossVacataire(Number(teacher.tauxHoraire ?? 0), lineInput.heures);

      const { inps, its, net } = computePayroll(brut);
      const detail: PayrollDetail = {
        heures: lineInput.heures,
        tauxHoraire: teacher.tauxHoraire === null ? null : Number(teacher.tauxHoraire),
        salaireBase: teacher.salaireBase === null ? null : Number(teacher.salaireBase),
        indemniteTransport: lineInput.indemniteTransport,
        primeResponsabilite: lineInput.primeResponsabilite,
      };

      await this.prisma.payrollLine.upsert({
        where: { teacherId_periode: { teacherId: teacher.id, periode: input.periode } },
        create: {
          teacherId: teacher.id,
          periode: input.periode,
          montantBrut: brut,
          retenues: { inps, its },
          montantNet: net,
          detail: detail as unknown as Prisma.InputJsonValue,
          verificationId: generatePayslipVerificationId(input.periode, teacher.matriculeEmploye),
          valideParProfileId: actorProfileId,
        },
        update: {
          montantBrut: brut,
          retenues: { inps, its },
          montantNet: net,
          detail: detail as unknown as Prisma.InputJsonValue,
          valideParProfileId: actorProfileId,
        },
      });
      count++;
    }

    return { generated: count };
  }

  async getPayslip(teacherId: string, periode: string, ecoleId: string) {
    const line = await this.prisma.payrollLine.findFirst({
      where: { teacherId, periode, teacher: { ecoleId } },
      include: { teacher: true },
    });
    if (!line) throw new ApiError(404, "PAYSLIP_NOT_FOUND", "Aucune paie générée pour cette période.");

    const detail = line.detail as unknown as PayrollDetail;
    const retenues = line.retenues as unknown as { inps: number; its: number };

    return {
      verificationId: line.verificationId,
      periode: line.periode,
      createdAt: line.createdAt,
      employe: {
        nom: line.teacher.nom,
        matricule: line.teacher.matriculeEmploye,
        statutEmploi: line.teacher.statutEmploi,
      },
      rubriques: {
        salaireBase: detail.salaireBase,
        heures: detail.heures,
        tauxHoraire: detail.tauxHoraire,
        indemniteTransport: detail.indemniteTransport,
        primeResponsabilite: detail.primeResponsabilite,
        cotisationInps: retenues.inps,
        impotIts: retenues.its,
      },
      brut: Number(line.montantBrut),
      retenues: round2(retenues.inps + retenues.its),
      net: Number(line.montantNet),
    };
  }
}
