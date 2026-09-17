import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../client";

export interface PayrollRow {
  teacherId: string;
  nom: string;
  poste: string;
  statutEmploi: "PERMANENT" | "VACATAIRE";
  salaireBase: number | null;
  tauxHoraire: number | null;
  genere: boolean;
  heures: number;
  brut: number | null;
  retenues: number | null;
  net: number | null;
}

export function usePayrollGridQuery(periode: string) {
  return useQuery({
    queryKey: ["payroll", "grid", periode],
    queryFn: () => apiRequest<{ grid: PayrollRow[] }>(`/payroll?periode=${periode}`).then((r) => r.grid),
  });
}

export interface PayrollLineInput {
  teacherId: string;
  heures: number;
  indemniteTransport: number;
  primeResponsabilite: number;
}

export function useGeneratePayrollMutation(periode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lines: PayrollLineInput[]) =>
      apiRequest<{ generated: number }>("/payroll/generate", { method: "POST", body: { periode, lines } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll", "grid", periode] }),
  });
}

export interface Payslip {
  verificationId: string;
  periode: string;
  createdAt: string;
  employe: { nom: string; matricule: string; statutEmploi: string };
  rubriques: {
    salaireBase: number | null;
    heures: number;
    tauxHoraire: number | null;
    indemniteTransport: number;
    primeResponsabilite: number;
    cotisationInps: number;
    impotIts: number;
  };
  brut: number;
  retenues: number;
  net: number;
}

export function usePayslipQuery(teacherId: string | undefined, periode: string) {
  return useQuery({
    queryKey: ["payroll", "payslip", teacherId, periode],
    queryFn: () => apiRequest<Payslip>(`/payroll/${teacherId}/payslip?periode=${periode}`),
    enabled: !!teacherId,
    retry: false,
  });
}
