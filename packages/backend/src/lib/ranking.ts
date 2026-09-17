export interface RankableStudent {
  id: string;
  average: number | null;
}

/**
 * Classement "1224" (competition ranking) : les ex æquo partagent le même
 * rang et le rang suivant est décalé du nombre d'ex æquo — deux élèves à la
 * 3ᵉ place ⇒ l'élève suivant est 5ᵉ, jamais 4ᵉ.
 *
 * Les élèves à moyenne null (matière incomplète) sont exclus du classement
 * et reçoivent un rang `null`.
 *
 * Comparaison en centièmes entiers pour éviter les faux ex æquo/écarts dus
 * aux imprécisions de flottants (ex. 14.995 vs 15.00 après arrondi).
 */
export function computeRanks(students: RankableStudent[]): Map<string, number | null> {
  const ranks = new Map<string, number | null>();

  const rankable = students
    .filter((s): s is { id: string; average: number } => s.average !== null)
    .map((s) => ({ id: s.id, cents: Math.round(s.average * 100) }))
    .sort((a, b) => b.cents - a.cents);

  let previousCents: number | null = null;
  let previousRank = 0;

  rankable.forEach((entry, index) => {
    const position = index + 1;
    const rank = entry.cents === previousCents ? previousRank : position;
    ranks.set(entry.id, rank);
    previousCents = entry.cents;
    previousRank = rank;
  });

  for (const s of students) {
    if (s.average === null) ranks.set(s.id, null);
  }

  return ranks;
}
