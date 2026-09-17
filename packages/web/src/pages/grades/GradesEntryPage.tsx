import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { useSession } from "../../auth/session-context";
import { useClassesQuery } from "../../api/hooks/useClasses";
import {
  useClassSubjectsQuery,
  useGradeGridQuery,
  useSaveGradesMutation,
  usePublishTermMutation,
  type GradeEntryInput,
} from "../../api/hooks/useGrades";
import { formatFrNumber } from "@orokia/shared";
import { ApiClientError } from "../../api/client";

function previewAverage(d1: number | null, d2: number | null, comp: number | null): number | null {
  if (d1 === null || d2 === null || comp === null) return null;
  return Math.round(((d1 + d2 + comp * 2) / 4) * 100) / 100;
}

export function GradesEntryPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { data: classes } = useClassesQuery();
  const [classeId, setClasseId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");

  const { data: subjects } = useClassSubjectsQuery(classeId || undefined);
  const { data: grid, isLoading } = useGradeGridQuery(classeId || undefined, subjectId || undefined);
  const saveMutation = useSaveGradesMutation(classeId || undefined, subjectId || undefined);
  const publishMutation = usePublishTermMutation();

  const [edits, setEdits] = useState<Record<string, { devoir1: string; devoir2: string; composition: string }>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!grid) return;
    const next: Record<string, { devoir1: string; devoir2: string; composition: string }> = {};
    for (const row of grid.rows) {
      next[row.studentId] = {
        devoir1: row.devoir1 === null ? "" : String(row.devoir1),
        devoir2: row.devoir2 === null ? "" : String(row.devoir2),
        composition: row.composition === null ? "" : String(row.composition),
      };
    }
    setEdits(next);
  }, [grid]);

  useEffect(() => {
    if (classes && classes.length > 0 && !classeId) setClasseId(classes[0]!.id);
  }, [classes, classeId]);

  useEffect(() => {
    if (subjects && subjects.length > 0) {
      if (!subjects.some((s) => s.subjectId === subjectId)) setSubjectId(subjects[0]!.subjectId);
    } else {
      setSubjectId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects]);

  function parseVal(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }

  function updateCell(studentId: string, field: "devoir1" | "devoir2" | "composition", value: string) {
    setEdits((prev) => ({ ...prev, [studentId]: { ...prev[studentId]!, [field]: value } }));
  }

  async function handleSave() {
    if (!grid) return;
    setErrorMessage(null);
    const entries: GradeEntryInput[] = grid.rows.map((row) => {
      const e = edits[row.studentId]!;
      return {
        studentId: row.studentId,
        devoir1: parseVal(e.devoir1),
        devoir2: parseVal(e.devoir2),
        composition: parseVal(e.composition),
      };
    });
    try {
      await saveMutation.mutateAsync(entries);
    } catch (err) {
      setErrorMessage(err instanceof ApiClientError ? err.message : "Erreur lors de l'enregistrement.");
    }
  }

  async function handlePublish() {
    if (!grid) return;
    if (!confirm(`Publier le trimestre ${grid.term.numero} pour tout l'établissement ? Les notes deviendront en lecture seule.`)) return;
    try {
      const result = await publishMutation.mutateAsync(grid.term.id);
      alert(`Trimestre publié — ${result.reportCardsCreated} bulletins générés.`);
    } catch (err) {
      setErrorMessage(err instanceof ApiClientError ? err.message : "Erreur lors de la publication.");
    }
  }

  const isLocked = grid?.term.statut === "CLOTUREE";
  const missingCount = grid
    ? grid.rows.filter((r) => {
        const e = edits[r.studentId] ?? { devoir1: "", devoir2: "", composition: "" };
        return previewAverage(parseVal(e.devoir1), parseVal(e.devoir2), parseVal(e.composition)) === null;
      }).length
    : 0;

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Notes et bulletins</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>
        Saisie des notes par classe et matière — Trimestre {grid?.term.numero ?? "…"}.
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
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

        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 13.5, fontFamily: "var(--font-sans)" }}
        >
          {subjects?.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.nom} (coef. {s.coefficient}) — {s.enseignant}
            </option>
          ))}
        </select>

        {grid && (
          <Badge
            label={grid.term.statut === "CLOTUREE" ? "Trimestre clôturé" : "Trimestre ouvert"}
            tone={grid.term.statut === "CLOTUREE" ? "neutral" : "success"}
          />
        )}
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

      {grid && (
        <>
          {isLocked && (
            <div
              style={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: 14,
                fontSize: 13,
                color: "var(--color-text-muted)",
                marginBottom: 16,
              }}
            >
              Ce trimestre est clôturé — les notes sont en lecture seule. Une correction individuelle (Direction/Censeur) reste
              possible depuis la fiche élève.
            </div>
          )}

          {errorMessage && (
            <div style={{ color: "var(--color-danger)", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{errorMessage}</div>
          )}

          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                  {["ÉLÈVE", "DEV. 1", "DEV. 2", "COMPOSITION", "MOYENNE"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((row) => {
                  const e = edits[row.studentId] ?? { devoir1: "", devoir2: "", composition: "" };
                  const avg = previewAverage(parseVal(e.devoir1), parseVal(e.devoir2), parseVal(e.composition));
                  return (
                    <tr key={row.studentId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td
                        style={{ padding: "8px 16px", fontWeight: 700, cursor: "pointer", color: "var(--color-blue)" }}
                        onClick={() => navigate(`/students/${row.studentId}`)}
                      >
                        {row.nom} {row.prenom}
                      </td>
                      {(["devoir1", "devoir2", "composition"] as const).map((field) => (
                        <td key={field} style={{ padding: "6px 16px" }}>
                          <input
                            value={e[field]}
                            disabled={isLocked}
                            onChange={(ev) => updateCell(row.studentId, field, ev.target.value)}
                            style={{
                              width: 64,
                              padding: "7px 9px",
                              border: "1.5px solid var(--color-border)",
                              borderRadius: 8,
                              fontSize: 13,
                              fontFamily: "var(--font-sans)",
                              background: isLocked ? "var(--color-bg)" : "#fff",
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: "6px 16px", fontWeight: 700, color: avg === null ? "var(--color-orange)" : undefined }}>
                        {avg !== null ? formatFrNumber(avg) : "Manquante"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
              {missingCount > 0 ? `${missingCount} moyenne(s) incomplète(s)` : "Toutes les moyennes sont complètes"}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              {!isLocked && (
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              )}
              {!isLocked && user?.role === "DIRECTION" && (
                <Button variant="urgent" onClick={handlePublish} disabled={publishMutation.isPending}>
                  {publishMutation.isPending ? "Publication…" : "Publier le trimestre"}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {!grid && !isLoading && classes && classes.length === 0 && (
        <div style={{ color: "var(--color-text-muted)" }}>Aucune classe disponible.</div>
      )}

      <div style={{ marginTop: 24 }}>
        <Link to="/classes" style={{ fontSize: 12.5, fontWeight: 700 }}>
          ← Classes et élèves
        </Link>
      </div>
    </StaffLayout>
  );
}
