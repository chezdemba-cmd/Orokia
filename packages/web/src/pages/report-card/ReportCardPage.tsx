import { Link, useParams } from "react-router-dom";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Button } from "../../components/Button";
import { useReportCardQuery } from "../../api/hooks/useGrades";
import { formatFrNumber } from "@orokia/shared";
import { ApiClientError } from "../../api/client";

export function ReportCardPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useReportCardQuery(id);

  return (
    <StaffLayout>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to={id ? `/students/${id}` : "/classes"} style={{ fontSize: 12.5, fontWeight: 700 }}>
          ← Fiche élève
        </Link>
        {data && (
          <Button variant="secondary" onClick={() => window.print()} style={{ padding: "8px 16px", fontSize: 13 }}>
            Imprimer / Exporter en PDF
          </Button>
        )}
      </div>

      {isLoading && <div style={{ marginTop: 16, color: "var(--color-text-muted)" }}>Chargement…</div>}

      {error && (
        <div style={{ marginTop: 16, color: "var(--color-text-muted)", fontSize: 13.5 }}>
          {error instanceof ApiClientError && error.statusCode === 404
            ? "Aucun bulletin publié pour ce trimestre — publiez le trimestre depuis Notes et bulletins."
            : "Erreur lors du chargement du bulletin."}
        </div>
      )}

      {data && (
        <div
          className="print-document"
          style={{
            maxWidth: 720,
            margin: "20px auto 0",
            background: "#fff",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "32px 36px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid var(--color-navy)", paddingBottom: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Groupe Scolaire Awa Danté</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Médina Coura, Bamako — Année {data.terme.anneeScolaire}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Bulletin — Trimestre {data.terme.numero}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-faint)" }}>{data.verificationId}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: 13.5 }}>
            <div>
              <div style={{ fontWeight: 800 }}>
                {data.eleve.nom} {data.eleve.prenom}
              </div>
              <div style={{ color: "var(--color-text-muted)" }}>
                {data.eleve.matricule} · {data.eleve.classe}
              </div>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 20 }}>
            <thead>
              <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                {["MATIÈRE", "COEF.", "DEV. 1", "DEV. 2", "COMPO.", "MOYENNE", "TOTAL"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", fontSize: 10.5, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.lignes.map((l) => (
                <tr key={l.matiere} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "7px 10px", fontWeight: 700 }}>{l.matiere}</td>
                  <td style={{ padding: "7px 10px" }}>{l.coefficient}</td>
                  <td style={{ padding: "7px 10px" }}>{l.devoir1 !== null ? formatFrNumber(l.devoir1) : "—"}</td>
                  <td style={{ padding: "7px 10px" }}>{l.devoir2 !== null ? formatFrNumber(l.devoir2) : "—"}</td>
                  <td style={{ padding: "7px 10px" }}>{l.composition !== null ? formatFrNumber(l.composition) : "—"}</td>
                  <td style={{ padding: "7px 10px", fontWeight: 700 }}>{l.moyenne !== null ? formatFrNumber(l.moyenne) : "—"}</td>
                  <td style={{ padding: "7px 10px" }}>{l.moyenne !== null ? formatFrNumber(Math.round(l.moyenne * l.coefficient * 100) / 100) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <SummaryCard label="Moyenne générale" value={data.generalAverage !== null ? formatFrNumber(data.generalAverage) : "Non classé"} />
            <SummaryCard label="Rang" value={data.rank !== null ? `${data.rank}ᵉ` : "—"} />
            <SummaryCard label="Moyenne de classe" value={data.moyenneDeClasse !== null ? formatFrNumber(data.moyenneDeClasse) : "—"} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--color-border)", fontSize: 11.5, color: "var(--color-text-muted)" }}>
            <span>Identifiant de vérification : {data.verificationId}</span>
            <span>Publié le {new Date(data.publishedAt).toLocaleDateString("fr-FR")}</span>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: "var(--color-bg)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
