import { useState } from "react";
import { Link } from "react-router-dom";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { usePayrollGridQuery, useGeneratePayrollMutation, type PayrollLineInput } from "../../api/hooks/usePayroll";
import { formatFrAmount } from "@orokia/shared";
import { ApiClientError } from "../../api/client";

function currentPeriode() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function PayrollPage() {
  const [periode] = useState(currentPeriode());
  const { data: grid, isLoading } = usePayrollGridQuery(periode);
  const generateMutation = useGeneratePayrollMutation(periode);
  const [inputs, setInputs] = useState<Record<string, { heures: string; indemniteTransport: string; primeResponsabilite: string }>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function fieldsFor(teacherId: string, defaults: { heures: number }) {
    return inputs[teacherId] ?? { heures: String(defaults.heures || ""), indemniteTransport: "15000", primeResponsabilite: "0" };
  }

  async function handleGenerate() {
    if (!grid) return;
    setErrorMessage(null);
    const lines: PayrollLineInput[] = grid.map((row) => {
      const f = fieldsFor(row.teacherId, row);
      return {
        teacherId: row.teacherId,
        heures: Number(f.heures) || 0,
        indemniteTransport: Number(f.indemniteTransport) || 0,
        primeResponsabilite: Number(f.primeResponsabilite) || 0,
      };
    });
    try {
      await generateMutation.mutateAsync(lines);
    } catch (err) {
      setErrorMessage(err instanceof ApiClientError ? err.message : "Erreur lors de la génération de la paie.");
    }
  }

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Paie des enseignants</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>Période {periode}.</div>

      {errorMessage && <div style={{ color: "var(--color-danger)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{errorMessage}</div>}
      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 18 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
              {["ENSEIGNANT", "STATUT", "HEURES / PRIME", "BRUT", "RETENUES", "NET", "ÉTAT", ""].map((h) => (
                <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid?.map((row) => {
              const f = fieldsFor(row.teacherId, row);
              const isVacataire = row.statutEmploi === "VACATAIRE";
              return (
                <tr key={row.teacherId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "9px 16px", fontWeight: 700 }}>{row.nom}</td>
                  <td style={{ padding: "9px 16px", color: "var(--color-text-muted)" }}>{row.statutEmploi === "PERMANENT" ? "Permanent" : "Vacataire"}</td>
                  <td style={{ padding: "9px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {isVacataire ? (
                        <input
                          type="number"
                          value={f.heures}
                          onChange={(e) => setInputs((prev) => ({ ...prev, [row.teacherId]: { ...f, heures: e.target.value } }))}
                          placeholder="Heures"
                          style={{ ...smallInput, width: 60 }}
                        />
                      ) : (
                        <>
                          <input
                            type="number"
                            value={f.indemniteTransport}
                            onChange={(e) => setInputs((prev) => ({ ...prev, [row.teacherId]: { ...f, indemniteTransport: e.target.value } }))}
                            placeholder="Transport"
                            style={{ ...smallInput, width: 80 }}
                          />
                          <input
                            type="number"
                            value={f.primeResponsabilite}
                            onChange={(e) => setInputs((prev) => ({ ...prev, [row.teacherId]: { ...f, primeResponsabilite: e.target.value } }))}
                            placeholder="Prime"
                            style={{ ...smallInput, width: 70 }}
                          />
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "9px 16px" }}>{row.brut !== null ? formatFrAmount(row.brut) : "—"}</td>
                  <td style={{ padding: "9px 16px" }}>{row.retenues !== null ? formatFrAmount(row.retenues) : "—"}</td>
                  <td style={{ padding: "9px 16px", fontWeight: 700 }}>{row.net !== null ? formatFrAmount(row.net) : "—"}</td>
                  <td style={{ padding: "9px 16px" }}>
                    <Badge label={row.genere ? "Prêt" : "À compléter"} tone={row.genere ? "success" : "warning"} />
                  </td>
                  <td style={{ padding: "9px 16px" }}>
                    {row.genere && (
                      <Link to={`/payroll/${row.teacherId}?periode=${periode}`} style={{ fontSize: 12, fontWeight: 700, color: "var(--color-blue)" }}>
                        Bulletin →
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
        {generateMutation.isPending ? "Génération…" : "Valider la paie"}
      </Button>
    </StaffLayout>
  );
}

const smallInput: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1.5px solid var(--color-border)",
  fontSize: 12,
  fontFamily: "var(--font-sans)",
};
