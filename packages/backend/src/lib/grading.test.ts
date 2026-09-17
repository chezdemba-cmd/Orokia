import { describe, expect, it } from "vitest";
import { computeSubjectAverage, computeGeneralAverage } from "./grading.js";

describe("computeSubjectAverage", () => {
  it("calcule (d1 + d2 + compo*2) / 4 quand tout est présent", () => {
    expect(computeSubjectAverage(12, 14, 15)).toBe(14);
  });

  it("retourne null si devoir1 manque", () => {
    expect(computeSubjectAverage(null, 14, 15)).toBeNull();
  });

  it("retourne null si devoir2 manque", () => {
    expect(computeSubjectAverage(12, null, 15)).toBeNull();
  });

  it("retourne null si la composition manque", () => {
    expect(computeSubjectAverage(12, 14, null)).toBeNull();
  });

  it("ne remplace jamais une valeur manquante par 0", () => {
    // Si 0 était substitué, la moyenne serait (0+14+15*2)/4 = 11, pas null.
    expect(computeSubjectAverage(null, 14, 15)).not.toBe(11);
  });
});

describe("computeGeneralAverage", () => {
  it("pondère par coefficient et arrondit à 2 décimales", () => {
    const result = computeGeneralAverage([
      { average: 15, coefficient: 4 },
      { average: 10, coefficient: 2 },
    ]);
    // (15*4 + 10*2) / 6 = 13.333...
    expect(result).toBe(13.33);
  });

  it("retourne null si une seule matière est incomplète", () => {
    const result = computeGeneralAverage([
      { average: 15, coefficient: 4 },
      { average: null, coefficient: 2 },
    ]);
    expect(result).toBeNull();
  });

  it("retourne null pour une liste vide", () => {
    expect(computeGeneralAverage([])).toBeNull();
  });

  it("gère un arrondi qui pourrait mal se comporter en flottant naïf", () => {
    const result = computeGeneralAverage([
      { average: 14.995, coefficient: 1 },
      { average: 14.995, coefficient: 1 },
    ]);
    expect(result).toBe(15);
  });
});
