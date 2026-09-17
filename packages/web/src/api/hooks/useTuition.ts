import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";

export interface TuitionFeeRow {
  tuitionFeeId: string;
  studentId: string;
  matricule: string;
  nom: string;
  prenom: string;
  classe: string;
  montantDu: number;
  montantVerse: number;
  solde: number;
  etat: "SOLDE" | "A_JOUR" | "EN_RETARD";
}

export interface TuitionSummary {
  totalDu: number;
  totalVerse: number;
  resteARecouvrer: number;
  enRetardCount: number;
}

export function useTuitionFeesQuery() {
  return useQuery({
    queryKey: ["tuition", "fees"],
    queryFn: () => apiRequest<{ fees: TuitionFeeRow[] }>("/tuition").then((r) => r.fees),
  });
}

export function useTuitionSummaryQuery() {
  return useQuery({
    queryKey: ["tuition", "summary"],
    queryFn: () => apiRequest<TuitionSummary>("/tuition/summary"),
  });
}

export interface Receipt {
  recuId: string;
  eleve: { nom: string; prenom: string; matricule: string; classe: string };
  objet: string;
  montant: number;
  modePaiement: string;
  referenceTransaction: string | null;
  remisPar: string;
  soldeApres: number;
  dateHeure: string;
}

export function useReceiptsTodayQuery() {
  return useQuery({
    queryKey: ["tuition", "receipts-today"],
    queryFn: () => apiRequest<{ receipts: { verificationId: string; eleve: string; montant: number; modePaiement: string; dateHeure: string }[] }>("/tuition/receipts/today").then((r) => r.receipts),
  });
}

export function useRecordPaymentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      ...input
    }: {
      studentId: string;
      montant: number;
      modePaiement: string;
      referenceTransaction?: string | null;
      remisPar: string;
    }) => apiRequest<Receipt>(`/tuition/students/${studentId}/payments`, { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tuition"] });
    },
  });
}
