import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../client";
import type { Niveau } from "./useClasses";

export interface DashboardSummary {
  effectifTotal: number;
  enseignantsCount: number;
  classesCount: number;
  moyenneGenerale: number | null;
  tauxPresence: number | null;
  absencesATraiter: number;
  moyenneParNiveau: { niveau: Niveau; moyenne: number | null; classesCount: number }[];
  presenceParJour: { date: string; taux: number }[];
}

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: () => apiRequest<DashboardSummary>("/reports/dashboard"),
  });
}
