import { useState } from "react";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { useSession } from "../../auth/session-context";
import { useClassesQuery } from "../../api/hooks/useClasses";
import { useClassSubjectsQuery } from "../../api/hooks/useGrades";
import { useClasseTimetableQuery, useCreateSlotMutation, useDeleteSlotMutation } from "../../api/hooks/useTimetable";
import { ApiClientError } from "../../api/client";

const JOURS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
];

const ETAT_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  OK: "neutral",
  CONFLIT: "danger",
  ANNULE: "warning",
  DEPLACE: "warning",
};

export function TimetablePage() {
  const { user } = useSession();
  const canEdit = user?.role === "DIRECTION" || user?.role === "CENSEUR";

  const { data: classes } = useClassesQuery();
  const [classeId, setClasseId] = useState("");
  const { data: subjects } = useClassSubjectsQuery(classeId || undefined);
  const { data: slots, isLoading } = useClasseTimetableQuery(classeId || undefined);
  const createMutation = useCreateSlotMutation(classeId || undefined);
  const deleteMutation = useDeleteSlotMutation(classeId || undefined);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subjectId: "", jour: 1, heureDebut: "08:00", dureeMinutes: 60, salle: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (classes && classes.length > 0 && !classeId) setClasseId(classes[0]!.id);

  const conflictCount = slots?.filter((s) => s.etat === "CONFLIT").length ?? 0;

  async function handleCreate() {
    const subject = subjects?.find((s) => s.subjectId === form.subjectId);
    if (!subject) {
      setErrorMessage("Choisissez une matière.");
      return;
    }
    setErrorMessage(null);
    try {
      await createMutation.mutateAsync({
        subjectId: subject.subjectId,
        teacherId: subject.teacherId,
        jour: form.jour,
        heureDebut: form.heureDebut,
        dureeMinutes: form.dureeMinutes,
        salle: form.salle || "Salle A",
      });
      setShowForm(false);
      setForm({ subjectId: "", jour: 1, heureDebut: "08:00", dureeMinutes: 60, salle: "" });
    } catch (err) {
      setErrorMessage(err instanceof ApiClientError ? err.message : "Erreur lors de la création du créneau.");
    }
  }

  async function handleDelete(slotId: string) {
    if (!confirm("Supprimer ce créneau ?")) return;
    try {
      await deleteMutation.mutateAsync(slotId);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : "Erreur lors de la suppression.");
    }
  }

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Emploi du temps</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>
        Semaine type — {classes?.find((c) => c.id === classeId)?.nom ?? "…"}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
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

        {conflictCount > 0 && <Badge label={`${conflictCount} créneau(x) en conflit`} tone="danger" />}

        {canEdit && (
          <Button variant="secondary" onClick={() => setShowForm((v) => !v)} style={{ padding: "9px 16px", fontSize: 13, marginLeft: "auto" }}>
            {showForm ? "Annuler" : "+ Ajouter un créneau"}
          </Button>
        )}
      </div>

      {showForm && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Matière">
            <select value={form.subjectId} onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))} style={selectStyle}>
              <option value="">—</option>
              {subjects?.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.nom} ({s.enseignant})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jour">
            <select value={form.jour} onChange={(e) => setForm((f) => ({ ...f, jour: Number(e.target.value) }))} style={selectStyle}>
              {JOURS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Heure">
            <input type="time" value={form.heureDebut} onChange={(e) => setForm((f) => ({ ...f, heureDebut: e.target.value }))} style={selectStyle} />
          </Field>
          <Field label="Durée (min)">
            <input
              type="number"
              value={form.dureeMinutes}
              onChange={(e) => setForm((f) => ({ ...f, dureeMinutes: Number(e.target.value) }))}
              style={{ ...selectStyle, width: 80 }}
            />
          </Field>
          <Field label="Salle">
            <input value={form.salle} onChange={(e) => setForm((f) => ({ ...f, salle: e.target.value }))} placeholder="Salle A" style={selectStyle} />
          </Field>
          <Button onClick={handleCreate} disabled={createMutation.isPending} style={{ padding: "10px 18px", fontSize: 13 }}>
            {createMutation.isPending ? "Ajout…" : "Ajouter"}
          </Button>
        </div>
      )}

      {errorMessage && <div style={{ color: "var(--color-danger)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{errorMessage}</div>}

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {JOURS.map((jour) => {
          const daySlots = (slots ?? []).filter((s) => s.jour === jour.value);
          return (
            <div key={jour.value} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 10 }}>{jour.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {daySlots.length === 0 && <span style={{ fontSize: 12, color: "var(--color-text-faint)" }}>—</span>}
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      border: "1px solid " + (slot.etat === "CONFLIT" ? "#FCA5A5" : "var(--color-border)"),
                      background: slot.etat === "CONFLIT" ? "#FEF2F2" : "var(--color-bg)",
                      borderRadius: 10,
                      padding: "9px 11px",
                      fontSize: 12,
                      position: "relative",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {slot.heureDebut} · {slot.matiere}
                    </div>
                    <div style={{ color: "var(--color-text-muted)" }}>
                      {slot.enseignant} · {slot.salle}
                    </div>
                    {slot.etat === "CONFLIT" && <div style={{ marginTop: 4 }}><Badge label="Conflit" tone="danger" /></div>}
                    {canEdit && (
                      <span
                        onClick={() => handleDelete(slot.id)}
                        style={{ position: "absolute", top: 8, right: 10, fontSize: 15, color: "var(--color-text-faint)", cursor: "pointer" }}
                      >
                        ×
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </StaffLayout>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1.5px solid var(--color-border)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-text-muted)" }}>{label.toUpperCase()}</span>
      {children}
    </div>
  );
}
