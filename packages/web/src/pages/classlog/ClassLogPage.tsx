import { useState } from "react";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Button } from "../../components/Button";
import { useSession } from "../../auth/session-context";
import { useClassesQuery } from "../../api/hooks/useClasses";
import { useClassSubjectsQuery } from "../../api/hooks/useGrades";
import { useClassLogsQuery, useCreateClassLogMutation } from "../../api/hooks/useClassLog";
import { ApiClientError } from "../../api/client";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ClassLogPage() {
  const { user } = useSession();
  const { data: classes } = useClassesQuery();
  const [classeId, setClasseId] = useState("");
  if (classes && classes.length > 0 && !classeId) setClasseId(classes[0]!.id);

  const { data: subjects } = useClassSubjectsQuery(classeId || undefined);
  const { data: logs, isLoading } = useClassLogsQuery(classeId || undefined);
  const createMutation = useCreateClassLogMutation(classeId || undefined);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subjectId: "", titre: "", contenu: "", consigne: "", echeance: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreate() {
    if (!form.subjectId || !form.titre || !form.contenu) {
      setErrorMessage("Matière, titre et contenu sont requis.");
      return;
    }
    setErrorMessage(null);
    try {
      await createMutation.mutateAsync({
        subjectId: form.subjectId,
        date: todayISO(),
        titre: form.titre,
        contenu: form.contenu,
        devoir: form.consigne ? { consigne: form.consigne, echeance: form.echeance || todayISO() } : null,
      });
      setShowForm(false);
      setForm({ subjectId: "", titre: "", contenu: "", consigne: "", echeance: "" });
    } catch (err) {
      setErrorMessage(err instanceof ApiClientError ? err.message : "Erreur lors de l'enregistrement.");
    }
  }

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Cahier de texte</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>Journal des séances par classe.</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
        <select
          value={classeId}
          onChange={(e) => setClasseId(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 13.5, fontFamily: "var(--font-sans)" }}
        >
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        {user?.role === "ENSEIGNANT" && (
          <Button variant="secondary" onClick={() => setShowForm((v) => !v)} style={{ padding: "9px 16px", fontSize: 13, marginLeft: "auto" }}>
            {showForm ? "Annuler" : "+ Ajouter une séance"}
          </Button>
        )}
      </div>

      {showForm && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} style={inputStyle}>
            <option value="">Matière…</option>
            {subjects?.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.nom}
              </option>
            ))}
          </select>
          <input placeholder="Titre de la séance" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} style={inputStyle} />
          <textarea placeholder="Contenu de la séance" value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
          <input placeholder="Devoir (optionnel)" value={form.consigne} onChange={(e) => setForm((f) => ({ ...f, consigne: e.target.value }))} style={inputStyle} />
          {form.consigne && (
            <input type="date" value={form.echeance} onChange={(e) => setForm((f) => ({ ...f, echeance: e.target.value }))} style={inputStyle} />
          )}
          {errorMessage && <span style={{ color: "var(--color-danger)", fontSize: 12.5 }}>{errorMessage}</span>}
          <Button onClick={handleCreate} disabled={createMutation.isPending} style={{ alignSelf: "flex-start" }}>
            {createMutation.isPending ? "Enregistrement…" : "Enregistrer la séance"}
          </Button>
        </div>
      )}

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {logs?.map((log) => (
          <div key={log.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{log.titre}</span>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{new Date(log.date).toLocaleDateString("fr-FR")}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginBottom: 8 }}>
              {log.matiere} · {log.enseignant}
            </div>
            <div style={{ fontSize: 13, marginBottom: log.devoir ? 10 : 0 }}>{log.contenu}</div>
            {log.devoir && (
              <div style={{ background: "var(--color-bg)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
                <strong>Devoir :</strong> {log.devoir.consigne} — échéance {new Date(log.devoir.echeance).toLocaleDateString("fr-FR")}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: "var(--color-text-faint)", marginTop: 8 }}>
              Signé par {log.signatures.signes}/{log.signatures.total} familles
            </div>
          </div>
        ))}
        {logs && logs.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13.5 }}>Aucune séance enregistrée.</div>}
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
