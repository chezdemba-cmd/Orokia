import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Niveau } from "@prisma/client";
import { buildTestApp } from "../helpers/app.js";
import { resetDatabase, testPrisma } from "../helpers/db.js";
import {
  createAccountWithProfile,
  createClasse,
  createEcole,
  createStudent,
  createSubject,
  createTerm,
  issueTestAccessToken,
  Role,
} from "../helpers/factory.js";

let app: FastifyInstance;

beforeEach(async () => {
  await resetDatabase();
  app = await buildTestApp();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function setupGradeScenario(termStatut: "OUVERTE" | "CLOTUREE") {
  const ecole = await createEcole();
  const term = await createTerm(ecole.id, 1, termStatut);
  const classe = await createClasse(ecole.id, Niveau.COLLEGE, "Classe Notes");
  const subject = await createSubject(ecole.id, "Mathématiques");
  const student = await createStudent(ecole.id, classe.id, "T-0001");

  const { account, profile } = await createAccountWithProfile(ecole.id, "+22370010001", Role.DIRECTION);
  const token = issueTestAccessToken(account.id, profile.id, ecole.id, Role.DIRECTION);

  const grade = await testPrisma.grade.create({
    data: { studentId: student.id, subjectId: subject.id, classeId: classe.id, termId: term.id, devoir1: 12, devoir2: 14, composition: 13, average: 13 },
  });

  return { ecole, term, classe, subject, student, token, profileId: profile.id, grade };
}

describe("Verrouillage de trimestre", () => {
  it("rejette une écriture directe sur un trimestre clôturé", async () => {
    const { classe, subject, student, token } = await setupGradeScenario("CLOTUREE");

    const res = await app.inject({
      method: "PUT",
      url: "/grades/grid",
      headers: { authorization: `Bearer ${token}` },
      payload: { classeId: classe.id, subjectId: subject.id, entries: [{ studentId: student.id, devoir1: 15, devoir2: 15, composition: 15 }] },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("TERM_CLOSED");
  });

  it("autorise l'écriture directe tant que le trimestre est ouvert", async () => {
    const { classe, subject, student, token } = await setupGradeScenario("OUVERTE");

    const res = await app.inject({
      method: "PUT",
      url: "/grades/grid",
      headers: { authorization: `Bearer ${token}` },
      payload: { classeId: classe.id, subjectId: subject.id, entries: [{ studentId: student.id, devoir1: 15, devoir2: 15, composition: 15 }] },
    });

    expect(res.statusCode).toBe(200);
  });
});

describe("Correction de note après clôture", () => {
  it("écrit la nouvelle valeur ET une entrée d'audit avec avant/après, atomiquement", async () => {
    const { grade, token, profileId } = await setupGradeScenario("CLOTUREE");

    const res = await app.inject({
      method: "PATCH",
      url: `/grades/${grade.id}/correction`,
      headers: { authorization: `Bearer ${token}` },
      payload: { composition: 18, motif: "Erreur de saisie initiale corrigée après vérification de la copie papier." },
    });

    expect(res.statusCode).toBe(200);
    const updated = res.json();
    expect(Number(updated.composition)).toBe(18);
    expect(Number(updated.average)).toBe(15.5); // (12 + 14 + 18*2) / 4

    const logs = await testPrisma.auditLog.findMany({ where: { action: "GRADE_CORRECTION", entityId: grade.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.actorProfileId).toBe(profileId);
    expect((logs[0]!.before as { composition: number }).composition).toBe(13);
    expect((logs[0]!.after as { composition: number }).composition).toBe(18);
  });

  it("refuse la correction si le trimestre est encore ouvert (il faut modifier directement)", async () => {
    const { grade, token } = await setupGradeScenario("OUVERTE");

    const res = await app.inject({
      method: "PATCH",
      url: `/grades/${grade.id}/correction`,
      headers: { authorization: `Bearer ${token}` },
      payload: { composition: 18, motif: "Motif suffisamment détaillé pour passer la validation." },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("TERM_NOT_CLOSED");
  });
});
