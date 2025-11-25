"use client";

import { useState } from "react";

type TrackResponse = {
  info?: unknown;
  summary?: {
    trackingId: string;
    carrier?: string;
    detectedCarrier?: string;
    detectedCarrierSlug?: string;
    status?: string;
    eta?: string;
    lastEvent?: string;
    lastLocation?: string;
    updatedAt?: string;
    scans?: { time?: string; location?: string; message?: string; status?: string }[];
  };
  error?: string;
  detail?: string;
};

const SAMPLE = {
  trackingId: "OH869664236GB",
  destinationCountry: "",
};

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState(SAMPLE.trackingId);
  const [destinationCountry, setDestinationCountry] = useState(
    SAMPLE.destinationCountry
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrackResponse | null>(null);

  async function handleSubmit() {
    setError("");
    setResult(null);
    const id = trackingId.trim();
    if (!id) {
      setError("Enter a tracking number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking_number: id,
          destinationCountry: destinationCountry || undefined,
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
          maxWidth: "900px",
          margin: "0 auto",
          padding: "32px 24px 48px",
        }}
      >
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Parcelsapp Tester</h1>
        <p style={{ marginBottom: "12px", color: "#9ca3af", fontSize: "14px" }}>
          Enter a tracking number. Destination country is optional; leave blank to auto-detect.
        </p>

        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>
          Tracking number
        </label>
        <input
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Tracking number"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#0b1224",
            color: "#e5e7eb",
            fontSize: "14px",
            marginBottom: "10px",
          }}
        />

        <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>
          Destination country (optional)
        </label>
        <input
          value={destinationCountry}
          onChange={(e) => setDestinationCountry(e.target.value)}
          placeholder="e.g. United Kingdom"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #374151",
            background: "#0b1224",
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
            <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Summary</h2>
            <div
              style={{
                border: "1px solid #1f2937",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ background: "#0f172a" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      Field
                    </th>
                    <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>Tracking #</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      {result.summary?.trackingId || trackingId}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>Carrier</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      {result.summary?.carrier || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      Detected carrier
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      {result.summary?.detectedCarrier || "N/A"}
                      {result.summary?.detectedCarrierSlug
                        ? ` (${result.summary.detectedCarrierSlug})`
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>Status</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      {result.summary?.status || "Unknown"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>ETA</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      {result.summary?.eta || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px", borderBottom: "1f2937" }}>Last Event</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                      {result.summary?.lastEvent || "N/A"}
                      {result.summary?.lastLocation ? ` @ ${result.summary.lastLocation}` : ""}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "10px" }}>Last Updated</td>
                    <td style={{ padding: "10px" }}>
                      {result.summary?.updatedAt || "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {result.summary?.scans && result.summary.scans.length > 0 && (
              <>
                <h3 style={{ fontSize: "14px", marginTop: "16px", marginBottom: "6px" }}>
                  Scans
                </h3>
                <div
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead style={{ background: "#0f172a" }}>
                      <tr>
                        <th
                          style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #1f2937" }}
                        >
                          Time
                        </th>
                        <th
                          style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #1f2937" }}
                        >
                          Location
                        </th>
                        <th
                          style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #1f2937" }}
                        >
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.summary.scans.map((scan, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                            {scan.time || "N/A"}
                          </td>
                          <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                            {scan.location || "N/A"}
                          </td>
                          <td style={{ padding: "10px", borderBottom: "1px solid #1f2937" }}>
                            {scan.message || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <h3 style={{ fontSize: "14px", marginTop: "12px", marginBottom: "6px" }}>
              Raw (for debugging)
            </h3>
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
              {JSON.stringify(result.info, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
