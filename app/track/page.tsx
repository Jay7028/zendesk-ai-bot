"use client";

import { useState } from "react";

type TrackResult = {
  registered?: unknown;
  refreshed?: unknown;
  trackInfo?: unknown;
  usedNumbers?: string[];
  error?: string;
  detail?: string;
};

const EXAMPLES = [
  "EZ1000000001",
  "9400110898825022579493",
  "1Z999AA10123456784",
  "9274899991899154345251",
];

export default function TrackTester() {
  const [number, setNumber] = useState(EXAMPLES[0]);
  const [carrier, setCarrier] = useState("usps");
  const [realtime, setRealtime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setResult(null);
    const trimmed = number.trim();
    if (!trimmed) {
      setError("Enter a tracking number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_and_fetch",
          carrier: carrier || undefined,
          numbers: [trimmed],
          realtime,
        }),
      });
      const data = (await res.json()) as TrackResult;
      if (!res.ok || data.error) {
        setError(data.error || "Request failed");
        if (data.detail) setError(`${data.error}: ${data.detail}`);
        return;
      }
      setResult(data);
    } catch (e: any) {
      setError(`Request failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          background: "#020617",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          border: "1px solid #1f2937",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
          17TRACK Tester
        </h1>
        <p style={{ marginBottom: "12px", color: "#9ca3af", fontSize: "14px" }}>
          Enter a tracking number and hit Test. Use the samples below if you
          don’t have one. Realtime refresh costs more quota; leave off unless
          you need it.
        </p>

        <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setNumber(ex)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #1f2937",
                background: "#0b1224",
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>
          Tracking number
        </label>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="e.g. 9400110898825022579493"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
            fontSize: "14px",
            marginBottom: "10px",
          }}
        />

        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>
          Carrier code (optional, helps detection)
        </label>
        <input
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="usps | ups | fedex | leave empty to auto-detect"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
            fontSize: "14px",
            marginBottom: "10px",
          }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <input
            type="checkbox"
            checked={realtime}
            onChange={(e) => setRealtime(e.target.checked)}
          />
          <span style={{ fontSize: "14px" }}>Force realtime refresh (uses more quota)</span>
        </label>

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
          onClick={handleSubmit}
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
          {loading ? "Fetching..." : "Test tracking"}
        </button>

        {result && (
          <div
            style={{
              marginTop: "8px",
              borderTop: "1px solid #1f2937",
              paddingTop: "16px",
            }}
          >
            <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Response</h2>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#0b1224",
                borderRadius: "8px",
                padding: "12px",
                border: "1px solid #1f2937",
                fontSize: "13px",
                lineHeight: 1.4,
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
