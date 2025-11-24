"use client";

import { useEffect, useState } from "react";

type LogStatus = "success" | "fallback" | "escalated";

interface LogEntry {
  id: string;
  timestamp: string;
  zendeskTicketId: string;
  specialistId: string;
  specialistName: string;
  intentId?: string | null;
  intentName?: string | null;
  inputSummary: string;
  knowledgeSources: string[];
  outputSummary: string;
  status: LogStatus;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/logs");
        if (!res.ok) throw new Error("Failed to load logs");
        const data: LogEntry[] = await res.json();
        setLogs(data);
      } catch (e: any) {
        setError(e.message ?? "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#020617",
        color: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid #111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top left, #22c55e22, transparent 60%)",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 600 }}>AI Run Logs</div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            View recent AI email runs from Zendesk.
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "#9ca3af" }}>
          Environment: <span style={{ color: "#22c55e" }}>Development</span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Primary sidebar */}
        <aside
          style={{
            width: "220px",
            borderRight: "1px solid #111827",
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: 8 }}>
            Navigation
          </div>
          {[
            { id: "inbox", label: "Inbox", href: "#" },
            { id: "triage", label: "Triage & Routing", href: "#" },
            { id: "specialists", label: "AI Specialists", href: "/admin" },
            { id: "intents", label: "Intents & Routing", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
            { id: "integrations", label: "Integrations", href: "/admin/integrations" },
            { id: "logs", label: "Logs", href: "/admin/logs", active: true },
            { id: "settings", label: "Settings", href: "#" },
          ].map((item) => (
            <a
              key={item.id}
              href={item.href}
              style={{
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  cursor: item.href === "#" ? "default" : "pointer",
                  fontSize: "13px",
                  background: item.active ? "#111827" : "transparent",
                  color: item.active ? "#e5e7eb" : "#9ca3af",
                }}
              >
                {item.label}
              </div>
            </a>
          ))}
        </aside>

        {/* Main logs content */}
        <main
          style={{
            flex: 1,
            padding: "16px 24px",
            overflowY: "auto",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: 600, marginBottom: 4 }}>
            Run Logs
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginBottom: 16,
            }}
          >
            Newest runs first. Use this to see which specialist responded and
            what the model produced.
          </p>

          {isLoading && (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Loading logs…</div>
          )}
          {error && (
            <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
              {error}
            </div>
          )}

          {!isLoading && logs.length === 0 && (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              No logs yet. Trigger the bot from Zendesk or use the debug button
              on /admin.
            </div>
          )}

          {logs.length > 0 && (
            <div
              style={{
                marginTop: 8,
                borderRadius: "12px",
                border: "1px solid #1f2937",
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <thead
                  style={{
                    backgroundColor: "#020617",
                    borderBottom: "1px solid #1f2937",
                  }}
                >
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px" }}>Time</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Ticket ID
                    </th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Specialist / Intent
                    </th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Status
                    </th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Input summary
                    </th>
                    <th style={{ textAlign: "left", padding: "8px" }}>
                      Output summary
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderTop: "1px solid #1f2937" }}
                    >
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        {log.zendeskTicketId}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <div>
                          {log.specialistName}{" "}
                          <span style={{ color: "#9ca3af" }}>
                            ({log.specialistId})
                          </span>
                        </div>
                        {log.intentName && (
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            Intent: {log.intentName}{" "}
                            {log.intentId && <span>({log.intentId})</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "999px",
                            border: "1px solid #374151",
                            fontSize: "11px",
                            textTransform: "capitalize",
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", maxWidth: 260 }}>
                        {log.inputSummary}
                      </td>
                      <td style={{ padding: "6px 8px", maxWidth: 260 }}>
                        {log.outputSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
