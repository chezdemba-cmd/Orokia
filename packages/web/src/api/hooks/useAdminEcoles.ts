import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateEcoleInput, EcoleSummary } from "@orokia/shared";
import { adminApiRequest } from "../admin-client";

export function useEcolesQuery() {
  return useQuery({
    queryKey: ["admin", "ecoles"],
    queryFn: () => adminApiRequest<{ ecoles: EcoleSummary[] }>("/ecoles").then((r) => r.ecoles),
  });
}

export function useCreateEcoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEcoleInput) =>
      adminApiRequest<EcoleSummary & { directionTelephone: string }>("/ecoles", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "ecoles"] }),
  });
}
