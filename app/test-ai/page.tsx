"use client";

import { useState } from "react";

type TestResult = {
  reply: string;
  intentId: string | null;
  intentName: string | null;
  specialistId: string | null;
  specialistName: string | null;
};

export default function TestAIPage() {
  const [message, setMessage] = useState(
    "Hi, my order is late. When will it arrive?"
  );
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    if (!message.trim()) return;
    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch("/api/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Test failed");
        return;
      }
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

      <main
        style={{
          flex: 1,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 860,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 16,
          }}
        >
          <section
            style={{
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              padding: "16px",
              boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                Customer message
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                This will be classified and answered using your intents &
                specialists.
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                color: "#111827",
                padding: "12px",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
            {error && (
              <div style={{ fontSize: 12, color: "#b91c1c" }}>{error}</div>
            )}
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
                {isLoading ? "Testing..." : "Run test"}
              </button>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Uses your live intents and specialists (no Zendesk calls).
              </div>
            </div>
          </section>

          {result && (
            <section
              style={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                padding: "16px",
                boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
                display: "grid",
                gridTemplateColumns: "260px 1fr",
                gap: 16,
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "12px",
                  background: "#f9fafb",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
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
                  intentId: {result.intentId ?? "n/a"} | specialistId:{" "}
                  {result.specialistId ?? "n/a"}
                </div>
              </div>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "12px",
                  background: "#f9fafb",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  AI reply
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
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
