import type { PrismaClient, Prisma } from "@prisma/client";

/** Client Prisma générique — soit le client racine, soit un client de transaction (RLS active dans les deux cas). */
export type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Exécute fn dans une transaction où PostgreSQL applique les policies RLS
 * pour restreindre toutes les requêtes à l'école donnée — deuxième couche de
 * défense sous le filtrage applicatif déjà en place.
 */
export function withEcoleScope<T>(prisma: PrismaClient, ecoleId: string, fn: (tx: Db) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_ecole_id', ${ecoleId}, true)`;
    return fn(tx);
  });
}

/**
 * Exécute fn avec la RLS désactivée — réservé à la couche identité (auth,
 * qui doit découvrir les profils d'un compte à travers toutes les écoles
 * avant qu'un contexte d'école existe) et à la couche plateforme
 * (super-admin, transverse par nature).
 */
export function withRlsBypass<T>(prisma: PrismaClient, fn: (tx: Db) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    return fn(tx);
  });
}
