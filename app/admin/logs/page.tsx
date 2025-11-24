"use client";

import { useEffect, useMemo, useState } from "react";

type LogStatus = "success" | "fallback" | "escalated";

type LogEntry = {
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
};

type TicketEvent = {
  id: string;
  ticketId: string;
  eventType: string;
  summary: string;
  detail: string;
  createdAt: string;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [logRes, eventRes] = await Promise.all([
          fetch("/api/logs"),
          fetch("/api/ticket-events"),
        ]);
        if (!logRes.ok) throw new Error("Failed to load logs");
        if (!eventRes.ok) throw new Error("Failed to load ticket events");
        const data: LogEntry[] = await logRes.json();
        const eventData: TicketEvent[] = await eventRes.json();
        setLogs(data);
        setEvents(eventData);
        if (data[0]) setSelectedTicket(data[0].zendeskTicketId);
      } catch (e: any) {
        setError(e.message ?? "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const tickets = useMemo(() => {
    const map = new Map<
      string,
      { ticketId: string; lastStatus: string; lastTime: number; count: number }
    >();
    const add = (ticketId: string, status: string, time: number) => {
      const existing = map.get(ticketId);
      if (!existing || existing.lastTime < time) {
        map.set(ticketId, { ticketId, lastStatus: status, lastTime: time, count: (existing?.count ?? 0) + 1 });
      } else {
        map.set(ticketId, {
          ticketId,
          lastStatus: existing.lastStatus,
          lastTime: existing.lastTime,
          count: (existing?.count ?? 0) + 1,
        });
      }
    };
    logs.forEach((l) => add(l.zendeskTicketId, l.status, new Date(l.timestamp).getTime()));
    events.forEach((ev) => add(ev.ticketId, ev.eventType, new Date(ev.createdAt).getTime()));
    return Array.from(map.values()).sort((a, b) => b.lastTime - a.lastTime);
  }, [logs, events]);

  const timeline = useMemo(() => {
    if (!selectedTicket) return [];
    const filteredEvents = events
      .filter((ev) => ev.ticketId === selectedTicket)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const filteredLogs = logs
      .filter((l) => l.zendeskTicketId === selectedTicket)
      .map((l) => ({
        id: `log-${l.id}`,
        ticketId: l.zendeskTicketId,
        eventType: l.status,
        summary: `Specialist: ${l.specialistName} (${l.specialistId})${l.intentName ? ` | Intent: ${l.intentName}` : ""}`,
        detail: `Input: ${l.inputSummary}\nOutput: ${l.outputSummary}`,
        createdAt: l.timestamp,
      }));
    return [...filteredEvents, ...filteredLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [events, logs, selectedTicket]);

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
      {/* Top bar */}
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
          <div style={{ fontSize: "20px", fontWeight: 700 }}>Ticket Activity</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            See intents, specialist replies, handovers, and errors per ticket.
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          Environment: <span style={{ color: "#22c55e", fontWeight: 600 }}>Development</span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Primary sidebar */}
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
            { id: "logs", label: "Logs", href: "/admin/logs", active: true },
            { id: "test-ai", label: "Test AI", href: "/test-ai" },
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
                  padding: "10px 12px",
                  borderRadius: "10px",
                  cursor: item.href === "#" ? "default" : "pointer",
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

        {/* Main content */}
        <main
          style={{
            flex: 1,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflowY: "auto",
            background: "#f5f7fb",
          }}
        >
          {isLoading && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>Loading logs...</div>
          )}
          {error && (
            <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
              {error}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "280px 1fr",
              gap: 16,
              minHeight: "60vh",
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#ffffff",
                overflowY: "auto",
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
              }}
            >
              <div
                style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#111827" }}
              >
                Tickets
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tickets.map((t) => {
                  const isSelected = t.ticketId === selectedTicket;
                  return (
                    <button
                      key={t.ticketId}
                      onClick={() => setSelectedTicket(t.ticketId)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: isSelected
                          ? "1px solid #c7d2fe"
                          : "1px solid #e5e7eb",
                        background: isSelected ? "#eef2ff" : "#ffffff",
                        color: "#111827",
                        cursor: "pointer",
                        boxShadow: isSelected
                          ? "0 4px 10px rgba(99,102,241,0.1)"
                          : "0 1px 4px rgba(15,23,42,0.06)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {t.ticketId}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Status: {t.lastStatus} - {t.count} events
                      </div>
                    </button>
                  );
                })}
                {tickets.length === 0 && !isLoading && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    No tickets yet.
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "16px",
                background: "#ffffff",
                overflowY: "auto",
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
              }}
            >
              {!selectedTicket && (
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Select a ticket to view activity.
                </div>
              )}
              {selectedTicket && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                    Ticket {selectedTicket}
                  </div>
                  {timeline.length === 0 && (
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      No events for this ticket yet.
                    </div>
                  )}
                  {timeline.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "10px",
                        background: "#f9fafb",
                        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 4,
                          color: "#6b7280",
                        }}
                      >
                        <span>{ev.eventType}</span>
                        <span>{new Date(ev.createdAt).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#111827" }}>
                        {ev.summary}
                      </div>
                      {ev.detail && (
                        <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "pre-wrap" }}>
                          {ev.detail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}











