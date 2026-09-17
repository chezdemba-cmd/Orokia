import { useState } from "react";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { KpiCard } from "../../components/KpiCard";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { useTuitionFeesQuery, useTuitionSummaryQuery, useReceiptsTodayQuery, useRecordPaymentMutation, type Receipt } from "../../api/hooks/useTuition";
import { formatFrAmount } from "@orokia/shared";
import { ApiClientError } from "../../api/client";

const ETAT_LABEL: Record<string, string> = { SOLDE: "Soldé", A_JOUR: "À jour", EN_RETARD: "En retard" };
const ETAT_TONE: Record<string, "success" | "warning" | "danger"> = { SOLDE: "success", A_JOUR: "warning", EN_RETARD: "danger" };

const MODES = [
  { value: "ESPECES", label: "Espèces" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "MOOV_MONEY", label: "Moov Money" },
  { value: "VIREMENT_BANCAIRE", label: "Virement bancaire" },
];

export function TuitionPage() {
  const { data: fees, isLoading } = useTuitionFeesQuery();
  const { data: summary } = useTuitionSummaryQuery();
  const { data: receipts } = useReceiptsTodayQuery();
  const recordPayment = useRecordPaymentMutation();

  const [filter, setFilter] = useState<"TOUS" | "EN_RETARD" | "SOLDE">("TOUS");
  const [payingStudent, setPayingStudent] = useState<{ id: string; nom: string; solde: number } | null>(null);
  const [form, setForm] = useState({ montant: "", modePaiement: "ESPECES", referenceTransaction: "", remisPar: "" });
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filtered = fees?.filter((f) => filter === "TOUS" || f.etat === filter);

  async function handleSubmitPayment() {
    if (!payingStudent) return;
    setErrorMessage(null);
    try {
      const result = await recordPayment.mutateAsync({
        studentId: payingStudent.id,
        montant: Number(form.montant),
        modePaiement: form.modePaiement,
        referenceTransaction: form.modePaiement === "ESPECES" ? null : form.referenceTransaction,
        remisPar: form.remisPar,
      });
      setReceipt(result);
      setPayingStudent(null);
      setForm({ montant: "", modePaiement: "ESPECES", referenceTransaction: "", remisPar: "" });
    } catch (err) {
      setErrorMessage(err instanceof ApiClientError ? err.message : "Erreur lors de l'encaissement.");
    }
  }

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Frais de scolarité</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>Écolage et encaissements — année 2025–2026.</div>

      {summary && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          <KpiCard label="Écolage dû" value={formatFrAmount(summary.totalDu)} />
          <KpiCard label="Encaissé" value={formatFrAmount(summary.totalVerse)} accent="var(--color-success)" />
          <KpiCard label="Reste à recouvrer" value={formatFrAmount(summary.resteARecouvrer)} accent="var(--color-orange)" />
          <KpiCard label="Dossiers en retard" value={String(summary.enRetardCount)} accent={summary.enRetardCount > 0 ? "var(--color-danger)" : undefined} />
        </div>
      )}

      {receipt && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 800 }}>Reçu {receipt.recuId}</span>
            <span onClick={() => setReceipt(null)} style={{ cursor: "pointer", color: "var(--color-text-muted)" }}>
              ×
            </span>
          </div>
          <div style={{ fontSize: 13 }}>
            {receipt.eleve.nom} {receipt.eleve.prenom} ({receipt.eleve.matricule}) · {receipt.objet}
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Montant : <strong>{formatFrAmount(receipt.montant)}</strong> · Solde après paiement : <strong>{formatFrAmount(receipt.soldeApres)}</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            Remis par {receipt.remisPar} · {new Date(receipt.dateHeure).toLocaleString("fr-FR")}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {(["TOUS", "EN_RETARD", "SOLDE"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1.5px solid " + (filter === f ? "var(--color-blue)" : "var(--color-border)"),
              background: filter === f ? "var(--color-blue)" : "#fff",
              color: filter === f ? "#fff" : "var(--color-text)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            {f === "TOUS" ? "Tous" : f === "EN_RETARD" ? "En retard" : "Soldés"}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ color: "var(--color-text-muted)" }}>Chargement…</div>}

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 2, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", alignSelf: "flex-start" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                {["ÉLÈVE", "CLASSE", "DÛ", "VERSÉ", "SOLDE", "ÉTAT", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, borderBottom: "1px solid var(--color-border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered?.map((f) => (
                <tr key={f.tuitionFeeId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "9px 16px", fontWeight: 700 }}>
                    {f.nom} {f.prenom}
                  </td>
                  <td style={{ padding: "9px 16px", color: "var(--color-text-muted)" }}>{f.classe}</td>
                  <td style={{ padding: "9px 16px" }}>{formatFrAmount(f.montantDu)}</td>
                  <td style={{ padding: "9px 16px" }}>{formatFrAmount(f.montantVerse)}</td>
                  <td style={{ padding: "9px 16px", fontWeight: 700 }}>{formatFrAmount(f.solde)}</td>
                  <td style={{ padding: "9px 16px" }}>
                    <Badge label={ETAT_LABEL[f.etat]!} tone={ETAT_TONE[f.etat]} />
                  </td>
                  <td style={{ padding: "9px 16px" }}>
                    {f.solde > 0 && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setPayingStudent({ id: f.studentId, nom: `${f.nom} ${f.prenom}`, solde: f.solde });
                          setReceipt(null);
                          setErrorMessage(null);
                        }}
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        Encaisser
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {payingStudent && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>Encaissement</div>
              <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginBottom: 12 }}>
                {payingStudent.nom} · Solde {formatFrAmount(payingStudent.solde)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="number"
                  placeholder="Montant (FCFA)"
                  value={form.montant}
                  onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {MODES.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setForm((f) => ({ ...f, modePaiement: m.value }))}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1.5px solid " + (form.modePaiement === m.value ? "var(--color-blue)" : "var(--color-border)"),
                        background: form.modePaiement === m.value ? "var(--color-blue)" : "#fff",
                        color: form.modePaiement === m.value ? "#fff" : "var(--color-text)",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {form.modePaiement !== "ESPECES" && (
                  <input
                    placeholder={form.modePaiement === "VIREMENT_BANCAIRE" ? "Référence du virement" : "Numéro de transaction"}
                    value={form.referenceTransaction}
                    onChange={(e) => setForm((f) => ({ ...f, referenceTransaction: e.target.value }))}
                    style={inputStyle}
                  />
                )}
                <input placeholder="Remis par" value={form.remisPar} onChange={(e) => setForm((f) => ({ ...f, remisPar: e.target.value }))} style={inputStyle} />
                {errorMessage && <span style={{ color: "var(--color-danger)", fontSize: 12.5 }}>{errorMessage}</span>}
                <Button onClick={handleSubmitPayment} disabled={recordPayment.isPending}>
                  {recordPayment.isPending ? "Enregistrement…" : "Enregistrer l'encaissement"}
                </Button>
              </div>
            </div>
          )}

          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 13.5 }}>Reçus du jour</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {receipts?.map((r) => (
                <div key={r.verificationId} style={{ fontSize: 12.5, borderBottom: "1px solid #F1F5F9", paddingBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{r.eleve}</div>
                  <div style={{ color: "var(--color-text-muted)" }}>
                    {formatFrAmount(r.montant)} · {new Date(r.dateHeure).toLocaleTimeString("fr-FR")}
                  </div>
                </div>
              ))}
              {receipts && receipts.length === 0 && <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Aucun reçu aujourd'hui.</span>}
            </div>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1.5px solid var(--color-border)",
  fontSize: 13,
  fontFamily: "var(--font-sans)",
};
