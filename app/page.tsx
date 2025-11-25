"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setError("");
    setReply("");
    if (!message.trim()) {
      setError("Type a customer message first.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setReply(data.reply || "(No reply returned)");
    } catch (e: any) {
      setError("Request failed. Check console / network.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#0b1224",
        color: "#e5e7eb",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid #1f2937",
          background: "#0f172a",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "18px" }}>Zendesk AI Bot</div>
        <nav style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <a
            href="/"
            style={{ color: "#e5e7eb", textDecoration: "none", fontSize: "14px" }}
          >
            Home
          </a>
          <a
            href="/track"
            style={{ color: "#e5e7eb", textDecoration: "none", fontSize: "14px" }}
          >
            Track
          </a>
        </nav>
      </header>

      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          padding: "32px 24px 48px",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
          Zendesk AI Email Bot — Test Console
        </h1>
        <p style={{ marginBottom: "16px", color: "#9ca3af", fontSize: "14px" }}>
          Type a customer email message below and I&apos;ll show you the AI-generated reply.
        </p>

        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>
          Customer message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#0b1224",
            color: "#e5e7eb",
            fontSize: "14px",
            marginBottom: "12px",
          }}
          placeholder="Hi, my parcel is 3 days late. Can you check the status?..."
        />

        {error && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 10px",
              borderRadius: "6px",
              background: "#450a0a",
              color: "#fecaca",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: "999px",
            border: "none",
            cursor: loading ? "default" : "pointer",
            background: loading ? "#4b5563" : "#22c55e",
            color: "#020617",
            fontWeight: 600,
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          {loading ? "Thinking..." : "Generate Reply"}
        </button>

        {reply && (
          <div
            style={{
              marginTop: "8px",
              borderTop: "1px solid #1f2937",
              paddingTop: "16px",
            }}
          >
            <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>AI Reply</h2>
            <div
              style={{
                whiteSpace: "pre-wrap",
                background: "#0b1224",
                borderRadius: "8px",
                padding: "12px",
                border: "1px solid #1f2937",
                fontSize: "14px",
              }}
            >
              {reply}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
