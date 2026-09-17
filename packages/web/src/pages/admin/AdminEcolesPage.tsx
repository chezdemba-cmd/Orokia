import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { useAdminSession } from "../../auth/admin-session-context";
import { useEcolesQuery, useCreateEcoleMutation } from "../../api/hooks/useAdminEcoles";
import { ApiClientError } from "../../api/client";

const LABEL_STYLE: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", letterSpacing: "0.04em" };
const INPUT_STYLE: React.CSSProperties = {
  border: "1.5px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: 12,
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  outline: "none",
};

export function AdminEcolesPage() {
  const navigate = useNavigate();
  const { logout } = useAdminSession();
  const { data: ecoles, isLoading } = useEcolesQuery();
  const [showForm, setShowForm] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ nom: string; directionTelephone: string } | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <header
        style={{
          background: "var(--color-navy)",
          color: "#fff",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>OROKIA</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>PLATEFORME · SUPER-ADMIN</span>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            logout();
            navigate("/admin/login", { replace: true });
          }}
          style={{ padding: "8px 14px", fontSize: 13 }}
        >
          Déconnexion
        </Button>
      </header>

      <main style={{ padding: 28, maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em" }}>Établissements</div>
            <div style={{ color: "var(--color-text-muted)", fontSize: 13.5 }}>{ecoles ? `${ecoles.length} école(s)` : "…"}</div>
          </div>
          <Button onClick={() => setShowForm(true)} style={{ padding: "11px 18px", fontSize: 14 }}>
            + Créer une école
          </Button>
        </div>

        {createdInfo && (
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "var(--radius-md)", padding: 14, marginBottom: 18, fontSize: 13, color: "#166534" }}>
            <strong>{createdInfo.nom}</strong> créée. Compte Direction : <strong>{createdInfo.directionTelephone}</strong> (mot de passe transmis séparément).
          </div>
        )}

        {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                {["ÉCOLE", "ADRESSE", "ANNÉE SCOLAIRE", "ÉLÈVES", "ENSEIGNANTS", "CLASSES"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ecoles?.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 700 }}>{e.nom}</td>
                  <td style={{ padding: "10px 16px", color: "var(--color-text-muted)" }}>{e.adresse}</td>
                  <td style={{ padding: "10px 16px" }}>{e.anneeScolaireActive}</td>
                  <td style={{ padding: "10px 16px" }}>{e.effectifEleves}</td>
                  <td style={{ padding: "10px 16px" }}>{e.effectifEnseignants}</td>
                  <td style={{ padding: "10px 16px" }}>{e.nombreClasses}</td>
                </tr>
              ))}
              {ecoles && ecoles.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, color: "var(--color-text-muted)" }}>
                    Aucune école pour l'instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showForm && (
        <CreateEcoleModal
          onClose={() => setShowForm(false)}
          onCreated={(nom, directionTelephone) => {
            setShowForm(false);
            setCreatedInfo({ nom, directionTelephone });
          }}
        />
      )}
    </div>
  );
}

function CreateEcoleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (nom: string, directionTelephone: string) => void }) {
  const createMutation = useCreateEcoleMutation();
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [anneeScolaireActive, setAnneeScolaireActive] = useState("2025-2026");
  const [directionPhoneDigits, setDirectionPhoneDigits] = useState("");
  const [directionMotDePasse, setDirectionMotDePasse] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(16, 42, 67, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          padding: "28px 28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}>Créer une école</div>

        <form
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            setErrorMessage(null);
            createMutation.mutate(
              {
                nom,
                adresse,
                anneeScolaireActive,
                direction: { telephone: `+223${directionPhoneDigits.replace(/\D/g, "")}`, motDePasse: directionMotDePasse },
              },
              {
                onSuccess: (result) => onCreated(result.nom, result.directionTelephone),
                onError: (err) => setErrorMessage(err instanceof ApiClientError ? err.message : "Une erreur est survenue."),
              },
            );
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={LABEL_STYLE}>NOM DE L'ÉCOLE</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required style={INPUT_STYLE} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={LABEL_STYLE}>ADRESSE</span>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} required style={INPUT_STYLE} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={LABEL_STYLE}>ANNÉE SCOLAIRE</span>
            <input value={anneeScolaireActive} onChange={(e) => setAnneeScolaireActive(e.target.value)} placeholder="2025-2026" required style={INPUT_STYLE} />
          </label>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ ...LABEL_STYLE, color: "var(--color-text)" }}>COMPTE DIRECTION INITIAL</span>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={LABEL_STYLE}>TÉLÉPHONE</span>
              <div style={{ ...INPUT_STYLE, display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "var(--color-text-muted)" }}>+223</span>
                <input
                  value={directionPhoneDigits}
                  onChange={(e) => setDirectionPhoneDigits(e.target.value)}
                  required
                  style={{ border: "none", outline: "none", fontSize: 14, flex: 1, fontFamily: "var(--font-sans)" }}
                />
              </div>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={LABEL_STYLE}>MOT DE PASSE TEMPORAIRE</span>
              <input
                type="text"
                value={directionMotDePasse}
                onChange={(e) => setDirectionMotDePasse(e.target.value)}
                required
                minLength={8}
                style={INPUT_STYLE}
              />
            </label>
          </div>

          {errorMessage && <span style={{ fontSize: 12.5, color: "var(--color-danger)", fontWeight: 600 }}>{errorMessage}</span>}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Button type="button" variant="secondary" onClick={onClose} style={{ flex: 1, padding: "11px 16px", fontSize: 14 }}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending} style={{ flex: 1, padding: "11px 16px", fontSize: 14 }}>
              {createMutation.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
