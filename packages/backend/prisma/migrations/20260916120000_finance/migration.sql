-- Écolage/Encaissement (Payment) : reçu vérifiable + saisie de qui a remis l'argent.
ALTER TABLE "payments" ADD COLUMN "remisPar" TEXT NOT NULL DEFAULT '';
ALTER TABLE "payments" ADD COLUMN "verificationId" TEXT;
ALTER TABLE "payments" ALTER COLUMN "remisPar" DROP DEFAULT;

-- Paie (PayrollLine) : détail des rubriques + bulletin vérifiable + traçabilité de validation.
ALTER TABLE "payroll_lines" ADD COLUMN "detail" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "payroll_lines" ADD COLUMN "verificationId" TEXT;
ALTER TABLE "payroll_lines" ADD COLUMN "valideParProfileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "payroll_lines" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payroll_lines" ALTER COLUMN "detail" DROP DEFAULT;
ALTER TABLE "payroll_lines" ALTER COLUMN "valideParProfileId" DROP DEFAULT;

CREATE UNIQUE INDEX "payments_verificationId_key" ON "payments"("verificationId");
CREATE UNIQUE INDEX "payroll_lines_verificationId_key" ON "payroll_lines"("verificationId");

ALTER TABLE "payments" ALTER COLUMN "verificationId" SET NOT NULL;
ALTER TABLE "payroll_lines" ALTER COLUMN "verificationId" SET NOT NULL;
