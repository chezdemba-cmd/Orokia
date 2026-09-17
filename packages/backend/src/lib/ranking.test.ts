import { describe, expect, it } from "vitest";
import { computeRanks } from "./ranking.js";

describe("computeRanks", () => {
  it("classe simplement quand il n'y a aucune égalité", () => {
    const ranks = computeRanks([
      { id: "a", average: 15 },
      { id: "b", average: 12 },
      { id: "c", average: 18 },
    ]);
    expect(ranks.get("c")).toBe(1);
    expect(ranks.get("a")).toBe(2);
    expect(ranks.get("b")).toBe(3);
  });

  it("partage le rang pour une égalité de 2 et saute le rang suivant", () => {
    // 18, 15, 15, 10 -> rangs 1, 2, 2, 4 (pas 3 pour le dernier)
    const ranks = computeRanks([
      { id: "a", average: 18 },
      { id: "b", average: 15 },
      { id: "c", average: 15 },
      { id: "d", average: 10 },
    ]);
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(2);
    expect(ranks.get("c")).toBe(2);
    expect(ranks.get("d")).toBe(4);
  });

  it("gère une égalité de 3 ou plus (décalage égal à la taille du groupe)", () => {
    const ranks = computeRanks([
      { id: "a", average: 14 },
      { id: "b", average: 14 },
      { id: "c", average: 14 },
      { id: "d", average: 12 },
    ]);
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(1);
    expect(ranks.get("d")).toBe(4);
  });

  it("gère plusieurs groupes d'égalité distincts", () => {
    const ranks = computeRanks([
      { id: "a", average: 16 },
      { id: "b", average: 16 },
      { id: "c", average: 13 },
      { id: "d", average: 13 },
      { id: "e", average: 9 },
    ]);
    expect([ranks.get("a"), ranks.get("b")]).toEqual([1, 1]);
    expect([ranks.get("c"), ranks.get("d")]).toEqual([3, 3]);
    expect(ranks.get("e")).toBe(5);
  });

  it("classe une classe entièrement à égalité au rang 1", () => {
    const ranks = computeRanks([
      { id: "a", average: 10 },
      { id: "b", average: 10 },
      { id: "c", average: 10 },
    ]);
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(1);
  });

  it("exclut les moyennes null du classement (rang null, pas de trou dans les rangs)", () => {
    const ranks = computeRanks([
      { id: "a", average: 15 },
      { id: "b", average: null },
      { id: "c", average: 12 },
    ]);
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("c")).toBe(2);
    expect(ranks.get("b")).toBeNull();
  });

  it("retourne une map vide pour une liste vide", () => {
    expect(computeRanks([]).size).toBe(0);
  });

  it("ne fait pas de faux ex æquo à cause de l'imprécision des flottants", () => {
    const ranks = computeRanks([
      { id: "a", average: 14.99 },
      { id: "b", average: 15.0 },
    ]);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("a")).toBe(2);
  });
});
