import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { useAccountsQuery, useSetAccountEtatMutation, useAuditLogQuery } from "../../api/hooks/useAccounts";

const ROLE_LABELS: Record<string, string> = {
  DIRECTION: "Direction",
  CENSEUR: "Censeur",
  SECRETAIRE: "Secrétariat",
  ENSEIGNANT: "Enseignant",
  PARENT: "Parent",
  ELEVE: "Élève",
};

export function AccountsPage() {
  const { data: accounts, isLoading } = useAccountsQuery();
  const setEtatMutation = useSetAccountEtatMutation();
  const { data: auditLog } = useAuditLogQuery();

  const noTwoFactor = accounts?.filter(
    (a) => !a.twoFactorEnabled && ["DIRECTION", "CENSEUR", "SECRETAIRE"].includes(a.role),
  );

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Comptes et permissions</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>
        {accounts ? `${accounts.length} profils` : "…"}
      </div>

      {noTwoFactor && noTwoFactor.length > 0 && (
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 18, fontSize: 13, color: "#9A3412" }}>
          La double authentification n'est pas activée sur {noTwoFactor.length} compte(s) administratif(s).
        </div>
      )}

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 28 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
              {["TÉLÉPHONE", "RÔLE", "2FA", "ÉTAT", "DERNIÈRE CONNEXION", ""].map((h) => (
                <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts?.map((a) => (
              <tr key={a.profileId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "10px 16px", fontWeight: 700 }}>{a.telephone}</td>
                <td style={{ padding: "10px 16px" }}>{a.nom ?? ROLE_LABELS[a.role]}</td>
                <td style={{ padding: "10px 16px" }}>
                  <Badge label={a.twoFactorEnabled ? "Activée" : "Non activée"} tone={a.twoFactorEnabled ? "success" : "warning"} />
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <Badge label={a.etat === "ACTIF" ? "Actif" : "Suspendu"} tone={a.etat === "ACTIF" ? "success" : "danger"} />
                </td>
                <td style={{ padding: "10px 16px", color: "var(--color-text-muted)" }}>
                  {a.lastSeenAt ? new Date(a.lastSeenAt).toLocaleString("fr-FR") : "Jamais"}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <Button
                    variant="secondary"
                    onClick={() => setEtatMutation.mutate({ profileId: a.profileId, etat: a.etat === "ACTIF" ? "SUSPENDU" : "ACTIF" })}
                    style={{ padding: "6px 12px", fontSize: 12 }}
                  >
                    {a.etat === "ACTIF" ? "Suspendre" : "Réactiver"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Journal d'activité</div>
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
              {["DATE", "ACTEUR", "ACTION", "DÉTAIL"].map((h) => (
                <th key={h} style={{ padding: "9px 16px", fontSize: 10.5, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditLog?.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "8px 16px", color: "var(--color-text-muted)" }}>{new Date(l.createdAt).toLocaleString("fr-FR")}</td>
                <td style={{ padding: "8px 16px", fontWeight: 700 }}>{l.acteur}</td>
                <td style={{ padding: "8px 16px" }}>{l.action}</td>
                <td style={{ padding: "8px 16px", color: "var(--color-text-muted)" }}>{l.motif ?? `${l.entityType}${l.entityId ? " · " + l.entityId.slice(0, 8) : ""}`}</td>
              </tr>
            ))}
            {auditLog && auditLog.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: "var(--color-text-muted)" }}>
                  Aucun événement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </StaffLayout>
  );
}
