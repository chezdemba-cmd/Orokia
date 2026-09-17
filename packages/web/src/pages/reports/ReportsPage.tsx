import { StaffLayout } from "../../app/layouts/StaffLayout";
import { useNiveauStatsQuery } from "../../api/hooks/useReports";
import { formatFrNumber } from "@orokia/shared";

const NIVEAU_LABELS: Record<string, string> = { PRIMAIRE: "Primaire", COLLEGE: "Collège", LYCEE: "Lycée" };

export function ReportsPage() {
  const { data: stats, isLoading } = useNiveauStatsQuery();

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Rapports et statistiques</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>
        Synthèse par niveau — Trimestre 1, année 2025–2026.
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
              {["NIVEAU", "CLASSES", "ÉLÈVES", "MOYENNE", "PRÉSENCE"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats?.map((s) => {
              const bareme = s.niveau === "PRIMAIRE" ? 10 : 20;
              return (
                <tr key={s.niveau} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{NIVEAU_LABELS[s.niveau]}</td>
                  <td style={{ padding: "12px 16px" }}>{s.classesCount}</td>
                  <td style={{ padding: "12px 16px" }}>{s.effectif}</td>
                  <td style={{ padding: "12px 16px" }}>{s.moyenne !== null ? `${formatFrNumber(s.moyenne)}/${bareme}` : "—"}</td>
                  <td style={{ padding: "12px 16px", color: s.presence !== null && s.presence < 90 ? "var(--color-danger)" : undefined }}>
                    {s.presence !== null ? `${formatFrNumber(s.presence)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </StaffLayout>
  );
}
