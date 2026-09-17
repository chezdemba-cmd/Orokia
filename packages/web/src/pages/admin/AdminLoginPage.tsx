import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { useAdminSession } from "../../auth/admin-session-context";
import { useAdminLoginMutation, useAdminOtpVerifyMutation, type AdminLoginResult } from "../../api/hooks/useAdminAuth";
import { ApiClientError } from "../../api/client";

type Step = { name: "credentials" } | { name: "otp"; challengeId: string; devCode?: string };

const CARD_STYLE: React.CSSProperties = {
  width: 400,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "40px 32px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  boxShadow: "0 1px 3px rgba(16, 42, 67, 0.06)",
};

const PAGE_STYLE: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--color-navy)",
  padding: 24,
};

const LABEL_STYLE: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", letterSpacing: "0.04em" };

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { completeSession } = useAdminSession();
  const [step, setStep] = useState<Step>({ name: "credentials" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = useAdminLoginMutation();
  const otpVerifyMutation = useAdminOtpVerifyMutation();

  async function handleResult(result: AdminLoginResult) {
    setErrorMessage(null);
    if (result.status === "OTP_REQUIRED") {
      setStep({ name: "otp", challengeId: result.challengeId, devCode: result.devCode });
      return;
    }
    await completeSession(result.accessToken);
    navigate("/admin/ecoles", { replace: true });
  }

  function handleError(err: unknown) {
    setErrorMessage(err instanceof ApiClientError ? err.message : "Une erreur est survenue.");
  }

  if (step.name === "otp") {
    return (
      <div style={PAGE_STYLE}>
        <div style={CARD_STYLE}>
          <OtpForm
            challengeId={step.challengeId}
            devCode={step.devCode}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
            onSubmit={(code) => {
              setErrorMessage(null);
              otpVerifyMutation.mutate({ challengeId: step.challengeId, code }, { onSuccess: handleResult, onError: handleError });
            }}
            pending={otpVerifyMutation.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={PAGE_STYLE}>
      <div style={CARD_STYLE}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-blue)", letterSpacing: "0.06em" }}>OROKIA · PLATEFORME</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Administration</div>
          <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            Réservé à l'équipe plateforme — gestion des établissements.
          </div>
        </div>

        <CredentialsForm
          onSubmit={(telephone, motDePasse) => {
            setErrorMessage(null);
            loginMutation.mutate({ telephone, motDePasse }, { onSuccess: handleResult, onError: handleError });
          }}
          pending={loginMutation.isPending}
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}

function CredentialsForm({
  onSubmit,
  pending,
  errorMessage,
}: {
  onSubmit: (telephone: string, motDePasse: string) => void;
  pending: boolean;
  errorMessage: string | null;
}) {
  const [phoneDigits, setPhoneDigits] = useState("");
  const [motDePasse, setMotDePasse] = useState("");

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(`+223${phoneDigits.replace(/\D/g, "")}`, motDePasse);
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <span style={LABEL_STYLE}>TÉLÉPHONE</span>
        <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 15, display: "flex", gap: 9, alignItems: "center" }}>
          <span style={{ color: "var(--color-text-muted)" }}>+223</span>
          <input
            value={phoneDigits}
            onChange={(e) => setPhoneDigits(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 15, fontWeight: 600, flex: 1, fontFamily: "var(--font-sans)" }}
          />
        </div>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <span style={LABEL_STYLE}>MOT DE PASSE</span>
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          style={{
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: 15,
            fontSize: 15,
            fontFamily: "var(--font-sans)",
            outline: "none",
          }}
        />
        {errorMessage && <span style={{ fontSize: 12.5, color: "var(--color-danger)", fontWeight: 600, lineHeight: 1.45 }}>{errorMessage}</span>}
      </label>

      <Button type="submit" disabled={pending} style={{ marginTop: 4, opacity: pending ? 0.7 : 1 }}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}

function OtpForm({
  challengeId,
  devCode,
  errorMessage,
  setErrorMessage,
  onSubmit,
  pending,
}: {
  challengeId: string;
  devCode?: string;
  errorMessage: string | null;
  setErrorMessage: (v: string | null) => void;
  onSubmit: (code: string) => void;
  pending: boolean;
}) {
  const [code, setCode] = useState("");
  void challengeId;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Code de vérification</div>
        <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          Un code à 6 chiffres a été envoyé par SMS. Expire dans 5 minutes.
        </div>
      </div>

      {devCode && (
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "var(--radius-md)", padding: 12, fontSize: 12.5, color: "#9A3412" }}>
          Environnement de dev — code : <strong>{devCode}</strong>
        </div>
      )}

      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMessage(null);
          onSubmit(code);
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <span style={LABEL_STYLE}>CODE À 6 CHIFFRES</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            style={{
              border: "1.5px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 15,
              fontSize: 20,
              letterSpacing: "0.4em",
              textAlign: "center",
              fontFamily: "var(--font-sans)",
            }}
          />
        </label>
        {errorMessage && <span style={{ fontSize: 12.5, color: "var(--color-danger)", fontWeight: 600 }}>{errorMessage}</span>}

        <Button type="submit" disabled={code.length !== 6 || pending}>
          {pending ? "Vérification…" : "Valider"}
        </Button>
      </form>
    </>
  );
}
