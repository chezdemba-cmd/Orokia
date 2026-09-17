import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../client";

export type Niveau = "PRIMAIRE" | "COLLEGE" | "LYCEE";

export interface ClasseSummary {
  id: string;
  nom: string;
  niveau: Niveau;
  effectif: number;
  professeurPrincipal: string | null;
  moyenne: number | null;
  presence: number | null;
  statutSaisieNotes: string;
}

export interface RosterEntry {
  studentId: string;
  matricule: string;
  nom: string;
  prenom: string;
  moyenne: number | null;
  rang: number | null;
  absences: number;
  tuteur: { nom: string; telephone: string } | null;
}

export interface ClasseRoster {
  id: string;
  nom: string;
  niveau: Niveau;
  professeurPrincipal: string | null;
  effectif: number;
  roster: RosterEntry[];
}

export function useClassesQuery(niveau?: Niveau) {
  return useQuery({
    queryKey: ["classes", niveau ?? "all"],
    queryFn: () =>
      apiRequest<{ classes: ClasseSummary[] }>(`/classes${niveau ? `?niveau=${niveau}` : ""}`).then((r) => r.classes),
  });
}

export function useClasseRosterQuery(classeId: string | undefined) {
  return useQuery({
    queryKey: ["classes", classeId],
    queryFn: () => apiRequest<ClasseRoster>(`/classes/${classeId}`),
    enabled: !!classeId,
  });
}
