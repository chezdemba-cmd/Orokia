import { Link, useParams, useSearchParams } from "react-router-dom";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Button } from "../../components/Button";
import { usePayslipQuery } from "../../api/hooks/usePayroll";
import { formatFrAmount } from "@orokia/shared";
import { ApiClientError } from "../../api/client";

export function PayslipPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const [searchParams] = useSearchParams();
  const periode = searchParams.get("periode") ?? "";
  const { data, isLoading, error } = usePayslipQuery(teacherId, periode);

  return (
    <StaffLayout>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/payroll" style={{ fontSize: 12.5, fontWeight: 700 }}>
          ← Paie des enseignants
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
          {error instanceof ApiClientError && error.statusCode === 404 ? "Aucune paie générée pour cette période." : "Erreur de chargement."}
        </div>
      )}

      {data && (
        <div className="print-document" style={{ maxWidth: 640, margin: "20px auto 0", background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "32px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid var(--color-navy)", paddingBottom: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Groupe Scolaire Awa Danté</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Bulletin de paie — {data.periode}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: "var(--color-text-faint)" }}>{data.verificationId}</div>
          </div>

          <div style={{ marginBottom: 20, fontSize: 13.5 }}>
            <div style={{ fontWeight: 800 }}>{data.employe.nom}</div>
            <div style={{ color: "var(--color-text-muted)" }}>
              {data.employe.matricule} · {data.employe.statutEmploi === "PERMANENT" ? "Permanent" : "Vacataire"}
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
            <tbody>
              {data.rubriques.salaireBase !== null && <Row label="Salaire de base" value={formatFrAmount(data.rubriques.salaireBase)} />}
              {data.rubriques.tauxHoraire !== null && (
                <Row label={`Heures (${data.rubriques.heures} × ${formatFrAmount(data.rubriques.tauxHoraire)})`} value={formatFrAmount(data.rubriques.heures * data.rubriques.tauxHoraire)} />
              )}
              {data.rubriques.indemniteTransport > 0 && <Row label="Indemnité de transport" value={formatFrAmount(data.rubriques.indemniteTransport)} />}
              {data.rubriques.primeResponsabilite > 0 && <Row label="Prime de responsabilité" value={formatFrAmount(data.rubriques.primeResponsabilite)} />}
              <Row label="Cotisation INPS (3,6%)" value={`− ${formatFrAmount(data.rubriques.cotisationInps)}`} muted />
              <Row label="Impôt sur les traitements et salaires" value={`− ${formatFrAmount(data.rubriques.impotIts)}`} muted />
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <Total label="Brut" value={formatFrAmount(data.brut)} />
            <Total label="Retenues" value={formatFrAmount(data.retenues)} />
            <Total label="Net à payer" value={formatFrAmount(data.net)} emphasis />
          </div>

          <div style={{ fontSize: 11, color: "var(--color-text-faint)", borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
            Barème ITS simplifié à titre indicatif — à valider avec un comptable avant tout usage réel.
          </div>
        </div>
      )}
    </StaffLayout>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
      <td style={{ padding: "8px 0", color: muted ? "var(--color-danger)" : undefined }}>{label}</td>
      <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700, color: muted ? "var(--color-danger)" : undefined }}>{value}</td>
    </tr>
  );
}

function Total({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div style={{ flex: 1, background: emphasis ? "var(--color-navy)" : "var(--color-bg)", color: emphasis ? "#fff" : "var(--color-text)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
