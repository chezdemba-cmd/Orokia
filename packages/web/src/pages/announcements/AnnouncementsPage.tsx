import { useState } from "react";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { useSession } from "../../auth/session-context";
import { useAnnouncementsQuery, useCreateAnnouncementMutation } from "../../api/hooks/useAnnouncements";

const STATUT_TONE: Record<string, "success" | "warning" | "neutral"> = {
  PUBLIEE: "success",
  PROGRAMMEE: "warning",
  BROUILLON: "neutral",
};
const STATUT_LABEL: Record<string, string> = { PUBLIEE: "Publiée", PROGRAMMEE: "Programmée", BROUILLON: "Brouillon" };

export function AnnouncementsPage() {
  const { user } = useSession();
  const canCreate = user?.role === "DIRECTION" || user?.role === "CENSEUR";
  const { data: announcements, isLoading } = useAnnouncementsQuery();
  const createMutation = useCreateAnnouncementMutation();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: "", corps: "", cible: "Toute l'école", statut: "BROUILLON" as const });

  async function handleCreate() {
    if (!form.titre || !form.corps) return;
    await createMutation.mutateAsync(form);
    setShowForm(false);
    setForm({ titre: "", corps: "", cible: "Toute l'école", statut: "BROUILLON" });
  }

  return (
    <StaffLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Annonces</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 13.5 }}>Communications diffusées à l'établissement.</div>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((v) => !v)} style={{ padding: "10px 18px", fontSize: 13 }}>
            {showForm ? "Annuler" : "+ Nouvelle annonce"}
          </Button>
        )}
      </div>

      {showForm && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <input placeholder="Titre" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} style={inputStyle} />
          <textarea placeholder="Contenu" value={form.corps} onChange={(e) => setForm((f) => ({ ...f, corps: e.target.value }))} style={{ ...inputStyle, minHeight: 70 }} />
          <input placeholder="Cible (ex. Toute l'école, 9e A)" value={form.cible} onChange={(e) => setForm((f) => ({ ...f, cible: e.target.value }))} style={inputStyle} />
          <select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value as typeof f.statut }))} style={inputStyle}>
            <option value="BROUILLON">Enregistrer en brouillon</option>
            <option value="PUBLIEE">Publier immédiatement</option>
          </select>
          <Button onClick={handleCreate} disabled={createMutation.isPending} style={{ alignSelf: "flex-start" }}>
            {createMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      )}

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {announcements?.map((a) => (
          <div key={a.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{a.titre}</span>
              <Badge label={STATUT_LABEL[a.statut]!} tone={STATUT_TONE[a.statut]} />
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
              {a.cible} · {new Date(a.createdAt).toLocaleDateString("fr-FR")}
            </div>
            <div style={{ fontSize: 13 }}>{a.corps}</div>
          </div>
        ))}
      </div>
    </StaffLayout>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid var(--color-border)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
};
