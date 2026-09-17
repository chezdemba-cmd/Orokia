const frNumberFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** French display formatting: comma decimal separator, space thousands separator. Never used for storage. */
export function formatFrNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return frNumberFormatter.format(value);
}

export function formatFrAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA`;
}

/** Rounds to 2 decimals using integer arithmetic to avoid float drift (e.g. 14.995 cases). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
