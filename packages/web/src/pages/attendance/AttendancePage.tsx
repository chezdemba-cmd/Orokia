import { useState } from "react";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { useClassesQuery } from "../../api/hooks/useClasses";
import { useClasseTimetableQuery } from "../../api/hooks/useTimetable";
import { useAttendanceSessionQuery, useSaveAttendanceMutation, type AttendanceType } from "../../api/hooks/useAttendance";
import { ApiClientError } from "../../api/client";

const STATES: { value: AttendanceType; label: string; tone: "success" | "danger" | "warning" | "info" }[] = [
  { value: "PRESENT", label: "Présent", tone: "success" },
  { value: "ABSENT", label: "Absent", tone: "danger" },
  { value: "RETARD", label: "Retard", tone: "warning" },
  { value: "EXCUSE", label: "Excusé", tone: "info" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const { data: classes } = useClassesQuery();
  const [classeId, setClasseId] = useState("");
  const [date] = useState(todayISO());
  const { data: slots } = useClasseTimetableQuery(classeId || undefined);
  const [sessionId, setSessionId] = useState("");

  if (classes && classes.length > 0 && !classeId) setClasseId(classes[0]!.id);
  if (slots && slots.length > 0 && !sessionId) setSessionId(slots[0]!.id);

  const { data, isLoading } = useAttendanceSessionQuery(classeId || undefined, sessionId || undefined, date);
  const saveMutation = useSaveAttendanceMutation(classeId || undefined);

  const [edits, setEdits] = useState<Record<string, AttendanceType>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (data && Object.keys(edits).length === 0 && data.rows.length > 0) {
    const initial: Record<string, AttendanceType> = {};
    data.rows.forEach((r) => (initial[r.studentId] = r.type));
    setEdits(initial);
  }

  const counts = STATES.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = Object.values(edits).filter((v) => v === s.value).length;
    return acc;
  }, {});

  async function handleSave() {
    if (!data) return;
    setErrorMessage(null);
    try {
      await saveMutation.mutateAsync({
        sessionId,
        date,
        entries: data.rows.map((r) => ({ studentId: r.studentId, type: edits[r.studentId] ?? r.type })),
      });
    } catch (err) {
      setErrorMessage(err instanceof ApiClientError ? err.message : "Erreur lors de l'enregistrement.");
    }
  }

  function markAllPresent() {
    if (!data) return;
    const next: Record<string, AttendanceType> = {};
    data.rows.forEach((r) => (next[r.studentId] = "PRESENT"));
    setEdits(next);
  }

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Appel</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>
        {new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <select
          value={classeId}
          onChange={(e) => {
            setClasseId(e.target.value);
            setSessionId("");
            setEdits({});
          }}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 13.5, fontFamily: "var(--font-sans)" }}
        >
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>

        <select
          value={sessionId}
          onChange={(e) => {
            setSessionId(e.target.value);
            setEdits({});
          }}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 13.5, fontFamily: "var(--font-sans)" }}
        >
          {slots?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.heureDebut} · {s.matiere}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}
      {errorMessage && <div style={{ color: "var(--color-danger)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{errorMessage}</div>}

      {data && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {STATES.map((s) => (
              <Badge key={s.value} label={`${s.label} : ${counts[s.value] ?? 0}`} tone={s.tone} />
            ))}
            <Button variant="secondary" onClick={markAllPresent} style={{ padding: "8px 14px", fontSize: 12.5, marginLeft: "auto" }}>
              Tout marquer présent
            </Button>
          </div>

          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                  <th style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                    ÉLÈVE
                  </th>
                  <th style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                    STATUT
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.studentId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "8px 16px", fontWeight: 700 }}>
                      {row.nom} {row.prenom}
                    </td>
                    <td style={{ padding: "8px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {STATES.map((s) => {
                          const active = (edits[row.studentId] ?? row.type) === s.value;
                          return (
                            <button
                              key={s.value}
                              onClick={() => setEdits((prev) => ({ ...prev, [row.studentId]: s.value }))}
                              style={{
                                padding: "6px 11px",
                                borderRadius: 8,
                                border: "1.5px solid " + (active ? "var(--color-blue)" : "var(--color-border)"),
                                background: active ? "var(--color-blue)" : "#fff",
                                color: active ? "#fff" : "var(--color-text)",
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: "var(--font-sans)",
                              }}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Enregistrement…" : "Enregistrer l'appel"}
          </Button>
        </>
      )}
    </StaffLayout>
  );
}
