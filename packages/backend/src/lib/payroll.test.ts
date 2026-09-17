import { describe, expect, it } from "vitest";
import { computeInps, computeIts, computePayroll } from "./payroll.js";

describe("computeInps", () => {
  it("calcule 3,6% du brut", () => {
    expect(computeInps(100_000)).toBe(3600);
  });
  it("retourne 0 pour un brut nul", () => {
    expect(computeInps(0)).toBe(0);
  });
});

describe("computeIts (barème progressif)", () => {
  it("ne taxe rien sous le premier seuil", () => {
    expect(computeIts(40_000)).toBe(0);
  });
  it("taxe uniquement la tranche excédant le seuil exonéré", () => {
    // 60 000 -> 50 000 à 0% + 10 000 à 5% = 500
    expect(computeIts(60_000)).toBe(500);
  });
  it("applique plusieurs tranches progressivement, jamais le taux marginal sur tout le brut", () => {
    // 200 000 -> 50 000@0 + 100 000@5% (5000) + 50 000@12% (6000) = 11 000
    expect(computeIts(200_000)).toBe(11_000);
  });
  it("un brut plus élevé ne peut jamais donner un net inférieur à un brut plus faible", () => {
    const low = computePayroll(150_000);
    const high = computePayroll(200_000);
    expect(high.net).toBeGreaterThan(low.net);
  });
});

describe("computePayroll", () => {
  it("net = brut - (inps + its)", () => {
    const result = computePayroll(200_000);
    expect(result.retenues).toBe(round2(result.inps + result.its));
    expect(result.net).toBe(round2(result.brut - result.retenues));
  });
});

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
