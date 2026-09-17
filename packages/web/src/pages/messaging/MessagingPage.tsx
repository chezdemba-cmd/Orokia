import { useState } from "react";
import { StaffLayout } from "../../app/layouts/StaffLayout";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import {
  useContactsQuery,
  useConversationsQuery,
  useConversationMessagesQuery,
  useCreateConversationMutation,
  useSendMessageMutation,
} from "../../api/hooks/useMessaging";

export function MessagingPage() {
  const { data: conversations } = useConversationsQuery();
  const { data: contacts } = useContactsQuery();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState("");

  const { data: messages } = useConversationMessagesQuery(activeId);
  const sendMutation = useSendMessageMutation(activeId);
  const createMutation = useCreateConversationMutation();

  async function handleSend() {
    if (!draft.trim() || !activeId) return;
    await sendMutation.mutateAsync(draft.trim());
    setDraft("");
  }

  async function handleStartConversation(recipientProfileId: string) {
    const text = prompt("Premier message :");
    if (!text) return;
    const res = await createMutation.mutateAsync({ recipientProfileId, message: text });
    setActiveId(res.conversationId);
    setShowNew(false);
  }

  const activeConversation = conversations?.find((c) => c.id === activeId);

  return (
    <StaffLayout>
      <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Messagerie interne</div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, marginBottom: 20 }}>Échanges entre membres du personnel.</div>

      <div style={{ display: "flex", gap: 16, height: 520 }}>
        <div style={{ width: 280, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 12, borderBottom: "1px solid var(--color-border)" }}>
            <Button variant="secondary" onClick={() => setShowNew((v) => !v)} style={{ width: "100%", padding: "8px", fontSize: 12.5 }}>
              {showNew ? "Annuler" : "+ Nouveau message"}
            </Button>
          </div>
          {showNew && (
            <div style={{ padding: 12, borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {contacts?.map((c) => (
                <div
                  key={c.profileId}
                  onClick={() => handleStartConversation(c.profileId)}
                  style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}
                >
                  {c.nom}
                </div>
              ))}
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {conversations?.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #F1F5F9",
                  cursor: "pointer",
                  background: activeId === c.id ? "var(--color-bg)" : "transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{c.nom}</span>
                  {c.nonLus > 0 && <Badge label={String(c.nonLus)} tone="info" />}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.dernierMessage}
                </div>
              </div>
            ))}
            {conversations && conversations.length === 0 && (
              <div style={{ padding: 14, fontSize: 12.5, color: "var(--color-text-muted)" }}>Aucune conversation.</div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column" }}>
          {!activeId && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Sélectionnez une conversation.
            </div>
          )}
          {activeId && (
            <>
              <div style={{ padding: 14, borderBottom: "1px solid var(--color-border)", fontWeight: 700, fontSize: 13.5 }}>
                {activeConversation?.nom}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {messages?.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: m.expediteurEstMoi ? "flex-end" : "flex-start" }}>
                    <div
                      style={{
                        maxWidth: "70%",
                        background: m.expediteurEstMoi ? "var(--color-blue)" : "var(--color-bg)",
                        color: m.expediteurEstMoi ? "#fff" : "var(--color-text)",
                        borderRadius: 12,
                        padding: "9px 13px",
                        fontSize: 13,
                      }}
                    >
                      {m.corps}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 12, borderTop: "1px solid var(--color-border)", display: "flex", gap: 8 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Écrire un message…"
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--color-border)", fontSize: 13, fontFamily: "var(--font-sans)" }}
                />
                <Button onClick={handleSend} style={{ padding: "10px 18px", fontSize: 13 }}>
                  Envoyer
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}
