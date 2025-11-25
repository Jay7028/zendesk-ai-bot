"use client";

import { useState } from "react";

type TrackResponse = {
  created?: unknown;
  info?: unknown;
  tracking_number?: string;
  courier_code?: string;
  error?: string;
  detail?: string;
};

const SAMPLE_NUMBER = "H06A8A0002038467";
const DEFAULT_COURIER = "hermes-uk";

export default function TrackPage() {
  const [trackingNumber, setTrackingNumber] = useState(SAMPLE_NUMBER);
  const [courierCode, setCourierCode] = useState(DEFAULT_COURIER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrackResponse | null>(null);

  async function handleTest() {
    setError("");
    setResult(null);
    const num = trackingNumber.trim();
    const courier = courierCode.trim() || DEFAULT_COURIER;
    if (!num) {
      setError("Enter a tracking number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_number: num,
          courier_code: courier,
        }),
      });
      const data = (await res.json()) as TrackResponse;
      if (!res.ok || data.error) {
        setError(data.detail || data.error || "Request failed");
        return;
      }
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Request failed");
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
        background: "#0f172a",
        color: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          border: "1px solid #1f2937",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>TrackingMore Tester</h1>
        <p style={{ marginBottom: "12px", color: "#9ca3af", fontSize: "14px" }}>
          Enter a tracking number and courier code. Defaults to hermes-uk.
        </p>

        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>
          Tracking number
        </label>
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Tracking number"
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
          Courier code
        </label>
        <input
          value={courierCode}
          onChange={(e) => setCourierCode(e.target.value)}
          placeholder="hermes-uk"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
            fontSize: "14px",
            marginBottom: "12px",
          }}
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
          onClick={handleTest}
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
