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

export default function AdminTrackPage() {
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f5f7fb",
        color: "#111827",
        fontFamily:
          "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
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
          <div style={{ fontSize: "20px", fontWeight: 700 }}>Track</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Lookup parcels and view the latest events.
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
            { id: "test-ai", label: "Test AI", href: "/admin/test-ai" },
            { id: "track", label: "Track", href: "/admin/track", active: true },
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
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              background: "#ffffff",
              boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#6b7280" }}>
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
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  color: "#111827",
                  fontSize: "14px",
                  marginBottom: "10px",
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, color: "#6b7280" }}>
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
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  color: "#111827",
                  fontSize: "14px",
                  marginBottom: "12px",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "12px",
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
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                cursor: loading ? "default" : "pointer",
                background: loading ? "#9ca3af" : "#4f46e5",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "14px",
                boxShadow: "0 6px 12px rgba(79,70,229,0.2)",
              }}
            >
              {loading ? "Fetching..." : "Test tracking"}
            </button>
          </div>

          {result && (
            <div
              style={{
                marginTop: "8px",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "16px",
                background: "#ffffff",
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
              }}
            >
              <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>Summary</h2>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead style={{ background: "#f9fafb" }}>
                    <tr>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                        Field
                      </th>
                      <th style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>Tracking #</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                        {result.summary?.trackingId || trackingId}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>Carrier</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                        {result.summary?.carrier || "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                        Detected carrier
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                        {result.summary?.detectedCarrier || "N/A"}
                        {result.summary?.detectedCarrierSlug
                          ? ` (${result.summary.detectedCarrierSlug})`
                          : ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>Status</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                        {result.summary?.status || "Unknown"}
                      </td>
                    </tr>
                    {result.summary?.scans && result.summary.scans.length > 0 && (
                      <tr>
                        <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                          Last tracking event
                        </td>
                        <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                          {(() => {
                            const last = result.summary!.scans![0];
                            const pieces = [
                              last.time || null,
                              last.location || null,
                              last.message || null,
                              last.status || null,
                            ].filter(Boolean);
                            return pieces.join(" | ") || "N/A";
                          })()}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>ETA</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                        {result.summary?.eta || "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>Last Event</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
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
                    Last 3 Scans
                  </h3>
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
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
                      <thead style={{ background: "#f9fafb" }}>
                        <tr>
                          <th
                            style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e5e7eb" }}
                          >
                            Time
                          </th>
                          <th
                            style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e5e7eb" }}
                          >
                            Location
                          </th>
                          <th
                            style={{ textAlign: "left", padding: "10px", borderBottom: "1px solid #e5e7eb" }}
                          >
                            Message
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.summary.scans.slice(0, 3).map((scan, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                              {scan.time || "N/A"}
                            </td>
                            <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                              {scan.location || "N/A"}
                            </td>
                            <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
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
                  background: "#f9fafb",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #e5e7eb",
                  fontSize: "13px",
                  lineHeight: 1.4,
                }}
              >
                {JSON.stringify(result.info, null, 2)}
              </pre>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
