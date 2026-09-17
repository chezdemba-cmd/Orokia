import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/Button";
import { useSession } from "../../auth/session-context";
import {
  useLoginMutation,
  useSelectProfileMutation,
  useOtpVerifyMutation,
  useOtpResendMutation,
  type LoginResult,
  type ProfileOption,
} from "../../api/hooks/useAuth";
import { ApiClientError } from "../../api/client";

type Step =
  | { name: "credentials" }
  | { name: "profile"; loginToken: string; profiles: ProfileOption[] }
  | { name: "otp"; challengeId: string; devCode?: string };

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
  background: "var(--color-bg)",
  padding: 24,
};

const LABEL_STYLE: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", letterSpacing: "0.04em" };

export function LoginPage() {
  const navigate = useNavigate();
  const { completeSession } = useSession();
  const [step, setStep] = useState<Step>({ name: "credentials" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = useLoginMutation();
  const selectProfileMutation = useSelectProfileMutation();
  const otpVerifyMutation = useOtpVerifyMutation();
  const otpResendMutation = useOtpResendMutation();

  async function handleResult(result: LoginResult) {
    setErrorMessage(null);
    if (result.status === "PROFILE_SELECTION_REQUIRED") {
      setStep({ name: "profile", loginToken: result.loginToken, profiles: result.profiles });
      return;
    }
    if (result.status === "OTP_REQUIRED") {
      setStep({ name: "otp", challengeId: result.challengeId, devCode: result.devCode });
      return;
    }
    await completeSession(result.accessToken);
    navigate("/dashboard", { replace: true });
  }

  function handleError(err: unknown) {
    setErrorMessage(err instanceof ApiClientError ? err.message : "Une erreur est survenue.");
  }

  if (step.name === "profile") {
    return (
      <div style={PAGE_STYLE}>
        <div style={CARD_STYLE}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Choisir un profil</div>
            <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              Ce numéro est associé à plusieurs profils.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {step.profiles.map((p) => (
              <button
                key={p.profileId}
                onClick={() => {
                  selectProfileMutation.mutate(
                    { loginToken: step.loginToken, profileId: p.profileId },
                    { onSuccess: handleResult, onError: handleError },
                  );
                }}
                style={{
                  textAlign: "left",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: 15,
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "#fff",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {errorMessage && <span style={{ color: "var(--color-danger)", fontSize: 12.5 }}>{errorMessage}</span>}
        </div>
      </div>
    );
  }

  if (step.name === "otp") {
    return <OtpStep step={step} onResult={handleResult} onError={handleError} errorMessage={errorMessage} setErrorMessage={setErrorMessage} otpVerifyMutation={otpVerifyMutation} otpResendMutation={otpResendMutation} />;
  }

  return (
    <div style={PAGE_STYLE}>
      <div style={CARD_STYLE}>
        <img src="/assets/orokia-logo.png" alt="OROKIA" style={{ height: 34, alignSelf: "flex-start" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Se connecter</div>
          <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            Utilisez le numéro de téléphone communiqué à l'école.
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

        <div
          style={{
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: 14,
            fontSize: 12.5,
            color: "#475569",
            lineHeight: 1.55,
          }}
        >
          Première connexion ? Le code d'activation vous a été remis par le secrétariat de l'école.
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-faint)", textAlign: "center" }}>
          Français · Bamanankan · English
        </div>
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
  const [showPassword, setShowPassword] = useState(false);

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
            placeholder="76 24 18 05"
            style={{ border: "none", outline: "none", fontSize: 15, fontWeight: 600, flex: 1, fontFamily: "var(--font-sans)" }}
          />
        </div>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <span style={LABEL_STYLE}>MOT DE PASSE</span>
        <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 15, flex: 1, letterSpacing: showPassword ? "normal" : "0.25em", fontFamily: "var(--font-sans)" }}
          />
          <span onClick={() => setShowPassword((v) => !v)} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-blue)", cursor: "pointer" }}>
            {showPassword ? "Masquer" : "Afficher"}
          </span>
        </div>
        {errorMessage && <span style={{ fontSize: 12.5, color: "var(--color-danger)", fontWeight: 600, lineHeight: 1.45 }}>{errorMessage}</span>}
      </label>

      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-blue)", alignSelf: "flex-start", cursor: "pointer" }}>
        Mot de passe oublié ?
      </span>

      <Button type="submit" disabled={pending} style={{ marginTop: 4, opacity: pending ? 0.7 : 1 }}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}

function OtpStep({
  step,
  onResult,
  onError,
  errorMessage,
  setErrorMessage,
  otpVerifyMutation,
  otpResendMutation,
}: {
  step: { challengeId: string; devCode?: string };
  onResult: (result: LoginResult) => void | Promise<void>;
  onError: (err: unknown) => void;
  errorMessage: string | null;
  setErrorMessage: (v: string | null) => void;
  otpVerifyMutation: ReturnType<typeof useOtpVerifyMutation>;
  otpResendMutation: ReturnType<typeof useOtpResendMutation>;
}) {
  const [code, setCode] = useState("");

  return (
    <div style={PAGE_STYLE}>
      <div style={CARD_STYLE}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Code de vérification</div>
          <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            Un code à 6 chiffres a été envoyé par SMS. Expire dans 5 minutes.
          </div>
        </div>

        {step.devCode && (
          <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "var(--radius-md)", padding: 12, fontSize: 12.5, color: "#9A3412" }}>
            Environnement de dev — code : <strong>{step.devCode}</strong>
          </div>
        )}

        <form
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            setErrorMessage(null);
            otpVerifyMutation.mutate({ challengeId: step.challengeId, code }, { onSuccess: onResult, onError });
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

          <Button type="submit" disabled={code.length !== 6 || otpVerifyMutation.isPending}>
            {otpVerifyMutation.isPending ? "Vérification…" : "Valider"}
          </Button>
        </form>

        <span
          onClick={() => {
            setErrorMessage(null);
            otpResendMutation.mutate({ challengeId: step.challengeId, channel: "SMS" });
          }}
          style={{ fontSize: 13, fontWeight: 700, color: "var(--color-blue)", textAlign: "center", cursor: "pointer" }}
        >
          Renvoyer le code
        </span>
      </div>
    </div>
  );
}
