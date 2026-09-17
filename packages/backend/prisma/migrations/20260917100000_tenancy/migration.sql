-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_ecoleId_fkey";

-- DropIndex
DROP INDEX "classes_nom_anneeScolaire_key";

-- DropIndex
DROP INDEX "students_matricule_key";

-- DropIndex
DROP INDEX "subjects_nom_key";

-- DropIndex
DROP INDEX "teachers_matriculeEmploye_key";

-- DropIndex
DROP INDEX "terms_anneeScolaire_numero_key";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "ecoleId",
DROP COLUMN "etat";

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "ecoleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "ecoleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "ecoleId" TEXT NOT NULL,
ADD COLUMN     "etat" "AccountEtat" NOT NULL DEFAULT 'ACTIF';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "ecoleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "ecoleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "ecoleId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "classes_ecoleId_nom_anneeScolaire_key" ON "classes"("ecoleId", "nom", "anneeScolaire");

-- CreateIndex
CREATE UNIQUE INDEX "students_ecoleId_matricule_key" ON "students"("ecoleId", "matricule");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_ecoleId_nom_key" ON "subjects"("ecoleId", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_ecoleId_matriculeEmploye_key" ON "teachers"("ecoleId", "matriculeEmploye");

-- CreateIndex
CREATE UNIQUE INDEX "terms_ecoleId_anneeScolaire_numero_key" ON "terms"("ecoleId", "anneeScolaire", "numero");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "ecoles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

