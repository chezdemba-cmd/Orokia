import { useParams, Link } from "react-router-dom";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { KpiCard } from "../../components/KpiCard";
import { useStudentQuery } from "../../api/hooks/useStudent";
import { formatFrNumber } from "@orokia/shared";

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useStudentQuery(id);

  return (
    <StaffLayout>
      {data && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to={`/classes/${data.classe.id}`} style={{ fontSize: 12.5, fontWeight: 700 }}>
            ← {data.classe.nom}
          </Link>
          <Link to={`/students/${data.id}/bulletin`} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-blue)" }}>
            Voir le bulletin →
          </Link>
        </div>
      )}

      {isLoading && <div style={{ marginTop: 16, color: "var(--color-text-muted)" }}>Chargement…</div>}

      {data && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, marginBottom: 20 }}>
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--color-navy)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {data.prenom[0]}
              {data.nom[0]}
            </span>
            <div>
              <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {data.nom} {data.prenom}
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {data.matricule} · {data.classe.nom}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
            <KpiCard label="Moyenne générale" value={data.moyenneGenerale !== null ? formatFrNumber(data.moyenneGenerale) : "Incomplète"} />
            <KpiCard label="Rang" value={data.rang !== null ? `${data.rang}ᵉ` : "—"} />
            <KpiCard label="Absences" value={String(data.absences)} />
            <KpiCard label="Retards" value={String(data.retards)} />
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 420px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", fontSize: 13.5, fontWeight: 800, borderBottom: "1px solid var(--color-border)" }}>
                Notes — Trimestre 1
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                    {["MATIÈRE", "DEV. 1", "DEV. 2", "COMPO.", "MOYENNE"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.matieres.map((m) => (
                    <tr key={m.subjectId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 700 }}>{m.nom}</td>
                      <td style={{ padding: "10px 16px" }}>{m.devoir1 !== null ? formatFrNumber(m.devoir1) : "—"}</td>
                      <td style={{ padding: "10px 16px" }}>{m.devoir2 !== null ? formatFrNumber(m.devoir2) : "—"}</td>
                      <td style={{ padding: "10px 16px" }}>{m.composition !== null ? formatFrNumber(m.composition) : "—"}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 700, color: m.moyenne === null ? "var(--color-orange)" : undefined }}>
                        {m.moyenne !== null ? formatFrNumber(m.moyenne) : "Manquante"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ flex: "1 1 260px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 14 }}>Tuteurs légaux</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.tuteurs.map((t, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {t.nom} <span style={{ fontWeight: 500, color: "var(--color-text-muted)" }}>· {t.lien}</span>
                    </span>
                    <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
                      {t.telephone} · {t.canalPrefere === "sms" ? "SMS uniquement" : "Application installée"}
                    </span>
                  </div>
                ))}
                {data.tuteurs.length === 0 && <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Aucun tuteur renseigné.</span>}
              </div>
            </div>
          </div>
        </>
      )}
    </StaffLayout>
  );
}
