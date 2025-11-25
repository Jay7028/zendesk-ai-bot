"use client";

import { useEffect, useState } from "react";

type TestResult = {
  reply: string;
  intentId: string | null;
  intentName: string | null;
  specialistId: string | null;
  specialistName: string | null;
  actions: string[];
  ticketId: string;
  inputSummary: string;
};

type HistoryEntry = {
  id: string;
  title: string;
  message: string;
  result: TestResult;
  createdAt: string;
};

export default function TestAiPage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("testAiHistory");
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[];
        setHistory(parsed);
      }
    } catch (e) {
      console.error("Failed to load test AI history", e);
    }
  }, []);

  function persistHistory(next: HistoryEntry[]) {
    setHistory(next);
    try {
      localStorage.setItem("testAiHistory", JSON.stringify(next.slice(0, 30)));
    } catch {
      // ignore storage errors (storage might be unavailable)
    }
  }

  function openHistory(entry: HistoryEntry) {
    setMessage(entry.message);
    setResult(entry.result);
    setTicketId(entry.result.ticketId || "");
  }

  async function handleSend() {
    setError(null);
    setResult(null);
    if (!message.trim()) {
      setError("Type a customer message first.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, ticketId: ticketId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setResult(data);
      if (data.ticketId) setTicketId(data.ticketId);

      const entry: HistoryEntry = {
        id: data.ticketId || `local-${Date.now()}`,
        title: data.inputSummary || message.slice(0, 60) || "Test message",
        message,
        result: data,
        createdAt: new Date().toISOString(),
      };
      persistHistory([entry, ...history]);
    } catch (e: any) {
      setError("Request failed. Check console / network.");
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
          "Inter, system-ui, -apple-system, -apple-system, 'Segoe UI', sans-serif",
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
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>Test AI</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Send a test message and inspect routing/reply.
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
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
            { id: "home", label: "Home", href: "/" },
            { id: "specialists", label: "AI Specialists", href: "/admin/specialists" },
            { id: "intents", label: "Intents", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
            { id: "integrations", label: "Integrations", href: "/admin/integrations" },
            { id: "logs", label: "Logs", href: "/admin/logs" },
            { id: "test-ai", label: "Test AI", href: "/admin/test-ai", active: true },
            { id: "track", label: "Track", href: "/admin/track" },
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
          {/* Actions / history */}
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
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Ticket ID (optional)</div>
              <input
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder="Use a consistent ID to group logs"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  padding: "8px",
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Customer message</div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  color: "#111827",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
                placeholder="Hi, my parcel is 3 days late. Can you check the status?..."
              />
              {error && (
                <div
                  style={{
                    marginBottom: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontSize: "13px",
                  }}
                >
                  {error}
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={isLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: isLoading ? "default" : "pointer",
                  background: isLoading ? "#9ca3af" : "#4f46e5",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "14px",
                  boxShadow: "0 6px 12px rgba(79,70,229,0.2)",
                }}
              >
                {isLoading ? "Sending..." : "Send test"}
              </button>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Previous chats</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => openHistory(h)}
                    style={{
                      textAlign: "left",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "8px",
                      background: "#f9fafb",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {new Date(h.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {h.title || "Untitled chat"}
                    </div>
                  </button>
                ))}
                {history.length === 0 && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>No chats yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Result */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              background: "#ffffff",
              boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 320,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Result</div>
            {!result && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Send a message to see the reply, intent, and specialist routing.
              </div>
            )}
            {result && (
              <>
                <div style={{ fontSize: 13, color: "#111827" }}>
                  <strong>Reply:</strong>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      padding: "10px",
                      border: "1px solid #e5e7eb",
                      marginTop: "6px",
                    }}
                  >
                    {result.reply}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#111827", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span>
                    <strong>Intent:</strong> {result.intentName || "unknown"} ({result.intentId || "n/a"})
                  </span>
                  <span>
                    <strong>Specialist:</strong> {result.specialistName || "unknown"} (
                    {result.specialistId || "n/a"})
                  </span>
                  <span>
                    <strong>Ticket:</strong> {result.ticketId}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#111827" }}>
                  <strong>Actions:</strong>
                  <ul style={{ margin: "6px 0 0 16px" }}>
                    {result.actions?.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
