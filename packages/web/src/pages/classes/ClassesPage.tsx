import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Badge } from "../../components/Badge";
import { useClassesQuery, type Niveau } from "../../api/hooks/useClasses";
import { formatFrNumber } from "@orokia/shared";

const FILTERS: { value: Niveau | "TOUS"; label: string }[] = [
  { value: "TOUS", label: "Tous" },
  { value: "PRIMAIRE", label: "Primaire" },
  { value: "COLLEGE", label: "Collège" },
  { value: "LYCEE", label: "Lycée" },
];

export function ClassesPage() {
  const [filter, setFilter] = useState<Niveau | "TOUS">("TOUS");
  const { data, isLoading } = useClassesQuery(filter === "TOUS" ? undefined : filter);
  const navigate = useNavigate();

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Classes et élèves</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>
        {data ? `${data.length} classes` : "…"}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1.5px solid " + (filter === f.value ? "var(--color-blue)" : "var(--color-border)"),
              background: filter === f.value ? "var(--color-blue)" : "#fff",
              color: filter === f.value ? "#fff" : "var(--color-text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
              {["CLASSE", "EFFECTIF", "PROFESSEUR PRINCIPAL", "MOYENNE", "PRÉSENCE", "NOTES"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} style={{ padding: 20, color: "var(--color-text-muted)" }}>
                  Chargement…
                </td>
              </tr>
            )}
            {data?.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/classes/${c.id}`)}
                style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
              >
                <td style={{ padding: "12px 16px", fontWeight: 700 }}>{c.nom}</td>
                <td style={{ padding: "12px 16px" }}>{c.effectif}</td>
                <td style={{ padding: "12px 16px", color: "var(--color-text-muted)" }}>{c.professeurPrincipal ?? "—"}</td>
                <td style={{ padding: "12px 16px" }}>{c.moyenne !== null ? formatFrNumber(c.moyenne) : "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge
                    label={c.presence !== null ? `${formatFrNumber(c.presence)}%` : "—"}
                    tone={c.presence !== null && c.presence < 90 ? "warning" : "success"}
                  />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge label={c.statutSaisieNotes} tone={c.statutSaisieNotes === "Complètes" ? "success" : "warning"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StaffLayout>
  );
}
