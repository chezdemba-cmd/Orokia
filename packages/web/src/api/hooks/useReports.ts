import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../client";
import type { Niveau } from "./useClasses";

export interface NiveauStat {
  niveau: Niveau;
  effectif: number;
  classesCount: number;
  moyenne: number | null;
  presence: number | null;
}

export function useNiveauStatsQuery() {
  return useQuery({
    queryKey: ["reports", "niveaux"],
    queryFn: () => apiRequest<{ stats: NiveauStat[] }>("/reports/niveaux").then((r) => r.stats),
  });
}
