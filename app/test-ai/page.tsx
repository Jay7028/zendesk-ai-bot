"use client";

import { useEffect, useState } from "react";

type TestResult = {
  reply: string;
  intentId: string | null;
  intentName: string | null;
  specialistId: string | null;
  specialistName: string | null;
  actions: string[];
};

type LogEntry = {
  id: string;
  zendeskTicketId: string;
  intentName?: string | null;
  specialistName?: string | null;
  status: string;
  timestamp: string;
};

export default function TestAIPage() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [message, setMessage] = useState(
    "Hi, my order is late. When will it arrive?"
  );
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  async function loadHistory() {
    try {
      setIsLoadingHistory(true);
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      const filtered = (data as any[])
        .filter((l) => typeof l.zendeskTicketId === "string" && l.zendeskTicketId.startsWith("test-"))
        .map((l) => ({
          id: l.id,
          zendeskTicketId: l.zendeskTicketId,
          intentName: l.intentName ?? null,
          specialistName: l.specialistName ?? null,
          status: l.status ?? "unknown",
          timestamp: l.timestamp ?? l.created_at ?? "",
        }))
        .sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      setHistory(filtered);
    } catch (e: any) {
      console.error("History load failed", e);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleTest() {
    if (!message.trim()) return;
    try {
      setIsLoading(true);
      setError(null);

      const nextMessages = [...messages, { role: "user" as const, content: message }];
      const res = await fetch("/api/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Test failed");
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f5f7fb",
        color: "#111827",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <header
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>
            Test AI (no Zendesk)
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Simulate a customer message and see the intent, specialist, and reply
            without sending anything to Zendesk.
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          Endpoint: <span style={{ fontWeight: 600 }}>POST /api/test-ai</span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "220px",
            borderRight: "1px solid #e5e7eb",
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "#f9fafb",
          }}
        >
          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>
            Navigation
          </div>
          {[
            { id: "specialists", label: "AI Specialists", href: "/admin" },
            { id: "intents", label: "Intents & Routing", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
            { id: "integrations", label: "Integrations", href: "/admin/integrations" },
            { id: "logs", label: "Logs", href: "/admin/logs" },
            { id: "test-ai", label: "Test AI", href: "/test-ai", active: true },
          ].map((item) => (
            <a key={item.id} href={item.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "13px",
                  background: item.active ? "#eef2ff" : "transparent",
                  color: item.active ? "#1f2937" : "#6b7280",
                  fontWeight: item.active ? 600 : 500,
                  border: item.active ? "1px solid #c7d2fe" : "1px solid transparent",
                }}
              >
                {item.label}
              </div>
            </a>
          ))}
        </aside>

        <main
          style={{
            flex: 1,
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 16,
            overflowY: "auto",
          }}
        >
          {/* Actions / status */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "14px",
              background: "#ffffff",
              boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: "240px",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Actions</div>
            {result?.actions?.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.actions.map((action, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "8px",
                      background: "#f9fafb",
                      fontSize: 12,
                      color: "#111827",
                    }}
                  >
                    {action}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Actions and routing steps will appear here after a test.
              </div>
            )}
            <div
              style={{
                marginTop: 10,
                borderTop: "1px solid #e5e7eb",
                paddingTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>Test history</div>
              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  fontSize: 12,
                  cursor: isLoadingHistory ? "default" : "pointer",
                  opacity: isLoadingHistory ? 0.7 : 1,
                }}
              >
                {isLoadingHistory ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {history.length === 0 && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  No test runs yet.
                </div>
              )}
              {history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px",
                    background: "#f9fafb",
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#111827" }}>{h.zendeskTicketId}</div>
                  <div style={{ color: "#6b7280" }}>
                    Intent: {h.intentName ?? "unknown"} • Specialist: {h.specialistName ?? "none"}
                  </div>
                  <div style={{ color: "#6b7280" }}>
                    Status: {h.status}
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>
                    {h.timestamp ? new Date(h.timestamp).toLocaleString() : ""}
                  </div>
                </div>
              ))}
            </div>
            {result && (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px",
                  background: "#f9fafb",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>Classification</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Intent: {result.intentName ?? "unknown"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Specialist: {result.specialistName ?? "none"}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  intentId: {result.intentId ?? "n/a"} | specialistId: {result.specialistId ?? "n/a"}
                </div>
              </div>
            )}
          </div>

          {/* Conversation and reply */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: "1fr auto",
              gap: 12,
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                background: "#ffffff",
                padding: "16px",
                boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 320,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Conversation</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Back-and-forth messages stay here; nothing is sent to Zendesk.
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "12px",
                  background: "#f9fafb",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  overflowY: "auto",
                }}
              >
                {messages.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    Start the conversation with a customer message.
                  </div>
                )}
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.role === "user" ? "flex-start" : "flex-end",
                      maxWidth: "80%",
                      background: m.role === "user" ? "#eef2ff" : "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
                      fontSize: 13,
                      color: "#111827",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                      {m.role === "user" ? "Customer" : "Assistant"}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content}</div>
                  </div>
                ))}
              </div>

              {result && (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "12px",
                    background: "#f5f7fb",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Latest reply
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#111827",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    {result.reply || "No reply returned."}
                  </div>
                </div>
              )}
            </div>

            <section
              style={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                padding: "14px",
                boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Customer message</div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  color: "#111827",
                  padding: "10px",
                  fontSize: "13px",
                  resize: "vertical",
                }}
              />
              {error && <div style={{ fontSize: 12, color: "#b91c1c" }}>{error}</div>}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={handleTest}
                  disabled={isLoading}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    border: "none",
                    background: "#6366f1",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: isLoading ? "default" : "pointer",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? "Testing..." : "Send message"}
                </button>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Uses your live intents and specialists (no Zendesk calls).
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
