import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Niveau } from "@prisma/client";
import { buildTestApp } from "../helpers/app.js";
import { resetDatabase, testPrisma } from "../helpers/db.js";
import { createAccountWithProfile, createClasse, createEcole, createStudent, createTerm, issueTestAccessToken, Role } from "../helpers/factory.js";

let app: FastifyInstance;

beforeEach(async () => {
  await resetDatabase();
  app = await buildTestApp();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function setup() {
  const ecole = await createEcole();
  await createTerm(ecole.id, 1);
  const classe = await createClasse(ecole.id, Niveau.COLLEGE, "Classe Famille");

  const childOfA = await createStudent(ecole.id, classe.id, "F-0001", "Traoré", "Fatoumata");
  const childOfB = await createStudent(ecole.id, classe.id, "F-0002", "Keïta", "Oumar");

  const { account: accountA, profile: profileA } = await createAccountWithProfile(ecole.id, "+22370040001", Role.PARENT);
  const guardianA = await testPrisma.guardian.create({ data: { profileId: profileA.id, nom: "Traoré (mère)", lien: "Mère", telephoneE164: "+22370040001" } });
  await testPrisma.guardianStudent.create({ data: { guardianId: guardianA.id, studentId: childOfA.id } });

  const { account: accountB, profile: profileB } = await createAccountWithProfile(ecole.id, "+22370040002", Role.PARENT);
  const guardianB = await testPrisma.guardian.create({ data: { profileId: profileB.id, nom: "Keïta (père)", lien: "Père", telephoneE164: "+22370040002" } });
  await testPrisma.guardianStudent.create({ data: { guardianId: guardianB.id, studentId: childOfB.id } });

  const tokenA = issueTestAccessToken(accountA.id, profileA.id, ecole.id, Role.PARENT);
  const tokenB = issueTestAccessToken(accountB.id, profileB.id, ecole.id, Role.PARENT);

  return { childOfA, childOfB, tokenA, tokenB };
}

describe("Isolation des données familiales", () => {
  it("un parent voit son propre enfant dans /family/children", async () => {
    const { childOfA, tokenA } = await setup();
    const res = await app.inject({ method: "GET", url: "/family/children", headers: { authorization: `Bearer ${tokenA}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.children).toHaveLength(1);
    expect(body.children[0].studentId).toBe(childOfA.id);
  });

  it("un parent ne peut PAS lire l'emploi du temps de l'enfant d'un autre parent (403)", async () => {
    const { childOfB, tokenA } = await setup();
    const res = await app.inject({
      method: "GET",
      url: `/family/children/${childOfB.id}/schedule`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("NOT_YOUR_CHILD");
  });

  it("un parent ne peut PAS lire les notes de l'enfant d'un autre parent (403)", async () => {
    const { childOfB, tokenA } = await setup();
    const res = await app.inject({
      method: "GET",
      url: `/family/children/${childOfB.id}/grades`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("un parent ne peut PAS justifier une absence de l'enfant d'un autre parent (403)", async () => {
    const { childOfB, tokenA } = await setup();
    const student = await testPrisma.student.findUniqueOrThrow({ where: { id: childOfB.id } });
    const ecole = await testPrisma.ecole.findFirstOrThrow();
    const subject = await testPrisma.subject.create({ data: { nom: "Matière", ecoleId: ecole.id } });
    const teacherAccount = await testPrisma.account.create({
      data: { telephoneE164: "+22370040099", passwordHash: "x" },
    });
    const teacherProfile = await testPrisma.profile.create({ data: { accountId: teacherAccount.id, ecoleId: ecole.id, role: "ENSEIGNANT" } });
    const teacher = await testPrisma.teacher.create({
      data: { ecoleId: ecole.id, profileId: teacherProfile.id, matriculeEmploye: "ENS-FAM", nom: "Prof Test", statutEmploi: "PERMANENT" },
    });
    const slot = await testPrisma.timetableSlot.create({
      data: { classeId: student.classeId, subjectId: subject.id, teacherId: teacher.id, jour: 1, heureDebut: "08:00", dureeMinutes: 60, salle: "Salle F", anneeScolaire: "2025-2026" },
    });
    const attendance = await testPrisma.attendance.create({
      data: { studentId: childOfB.id, classeId: student.classeId, sessionId: slot.id, date: new Date(), type: "ABSENT" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/family/children/${childOfB.id}/attendance/${attendance.id}/justify`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { motif: "Rendez-vous médical" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("refuse l'accès à un profil ENSEIGNANT sur les routes réservées PARENT", async () => {
    const ecole = await createEcole();
    const { account, profile } = await createAccountWithProfile(ecole.id, "+22370040003", Role.ENSEIGNANT);
    const teacherToken = issueTestAccessToken(account.id, profile.id, ecole.id, Role.ENSEIGNANT);

    const res = await app.inject({ method: "GET", url: "/family/children", headers: { authorization: `Bearer ${teacherToken}` } });
    expect(res.statusCode).toBe(403);
  });
});
