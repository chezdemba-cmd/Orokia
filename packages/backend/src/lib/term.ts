import type { Db } from "./tenant-context.js";

/**
 * Trimestre "courant" pour l'affichage (tableau de bord, classes, fiche élève),
 * scopé à l'école de l'appelant. Pour l'instant le seul trimestre noté est
 * le T1 — un vrai sélecteur de trimestre est prévu avec une future itération
 * du module Notes et bulletins.
 */
export async function getCurrentTerm(prisma: Db, ecoleId: string) {
  const ecole = await prisma.ecole.findUniqueOrThrow({ where: { id: ecoleId } });
  return prisma.term.findFirstOrThrow({
    where: { ecoleId: ecole.id, anneeScolaire: ecole.anneeScolaireActive, numero: 1 },
  });
}
