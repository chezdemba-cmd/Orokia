import { useNavigate, useParams, Link } from "react-router-dom";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { useClasseRosterQuery } from "../../api/hooks/useClasses";
import { formatFrNumber } from "@orokia/shared";

export function ClassRosterPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useClasseRosterQuery(id);
  const navigate = useNavigate();

  return (
    <StaffLayout>
      <Link to="/classes" style={{ fontSize: 12.5, fontWeight: 700 }}>
        ← Classes et élèves
      </Link>

      {isLoading && <div style={{ marginTop: 16, color: "var(--color-text-muted)" }}>Chargement…</div>}

      {data && (
        <>
          <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 10, marginBottom: 4 }}>
            {data.nom}
          </div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>
            {data.effectif} élèves · Professeur principal : {data.professeurPrincipal ?? "—"}
          </div>

          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                  {["MATRICULE", "NOM", "PRÉNOM", "MOYENNE", "RANG", "ABSENCES", "TUTEUR"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.roster.map((r) => (
                  <tr
                    key={r.studentId}
                    onClick={() => navigate(`/students/${r.studentId}`)}
                    style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
                  >
                    <td style={{ padding: "12px 16px", color: "var(--color-blue)", fontWeight: 700 }}>{r.matricule}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>{r.nom}</td>
                    <td style={{ padding: "12px 16px" }}>{r.prenom}</td>
                    <td style={{ padding: "12px 16px", color: r.moyenne === null ? "var(--color-orange)" : undefined }}>
                      {r.moyenne !== null ? formatFrNumber(r.moyenne) : "Incomplète"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{r.rang ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>{r.absences}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-muted)" }}>{r.tuteur?.nom ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </StaffLayout>
  );
}
