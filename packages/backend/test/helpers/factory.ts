import { hash as argon2Hash } from "@node-rs/argon2";
import { Role, type AccountEtat, type Niveau } from "@prisma/client";
import { testPrisma } from "./db.js";
import { signAccessToken } from "../../src/lib/jwt.js";

export const DEFAULT_PASSWORD = "Test1234!";

export async function createEcole() {
  return testPrisma.ecole.create({
    data: { nom: "École Test", adresse: "Adresse test", anneeScolaireActive: "2025-2026" },
  });
}

export async function createTerm(ecoleId: string, numero = 1, statut: "OUVERTE" | "CLOTUREE" = "OUVERTE") {
  return testPrisma.term.create({ data: { ecoleId, numero, anneeScolaire: "2025-2026", statut } });
}

export async function createAccount(phone: string, opts: { password?: string; twoFactorEnabled?: boolean } = {}) {
  const passwordHash = await argon2Hash(opts.password ?? DEFAULT_PASSWORD);
  return testPrisma.account.create({
    data: {
      telephoneE164: phone,
      passwordHash,
      twoFactorEnabled: opts.twoFactorEnabled ?? false,
    },
  });
}

export async function createProfile(accountId: string, ecoleId: string, role: Role, opts: { etat?: AccountEtat } = {}) {
  return testPrisma.profile.create({ data: { accountId, ecoleId, role, etat: opts.etat ?? "ACTIF" } });
}

/** Compte + profil unique en une étape, pour les tests qui n'exercent pas le multi-profil. */
export async function createAccountWithProfile(
  ecoleId: string,
  phone: string,
  role: Role,
  opts: { password?: string; twoFactorEnabled?: boolean; etat?: AccountEtat } = {},
) {
  const account = await createAccount(phone, opts);
  const profile = await createProfile(account.id, ecoleId, role, { etat: opts.etat });
  return { account, profile };
}

export function issueTestAccessToken(accountId: string, profileId: string, ecoleId: string, role: Role, nom = "Test") {
  return signAccessToken({ accountId, profileId, ecoleId, role, nom, via2fa: true });
}

export async function createClasse(ecoleId: string, niveau: Niveau = Niveau.COLLEGE, nom = "Classe Test") {
  return testPrisma.classe.create({ data: { ecoleId, nom, niveau, anneeScolaire: "2025-2026" } });
}

export async function createSubject(ecoleId: string, nom = "Matière Test") {
  return testPrisma.subject.create({ data: { nom, ecoleId } });
}

export async function createStudent(ecoleId: string, classeId: string, matricule: string, nom = "Nom", prenom = "Prénom") {
  return testPrisma.student.create({
    data: { ecoleId, classeId, matricule, nom, prenom, dateNaissance: new Date(2012, 0, 1), dateInscription: new Date() },
  });
}

export async function createTeacher(ecoleId: string, profileId: string, matriculeEmploye: string, nom = "Enseignant Test") {
  return testPrisma.teacher.create({
    data: { ecoleId, profileId, matriculeEmploye, nom, statutEmploi: "PERMANENT", salaireBase: 150_000, tauxHoraire: 2500 },
  });
}

export { Role };
