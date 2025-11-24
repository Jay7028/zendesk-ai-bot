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
        summary: `Specialist: ${l.specialistName} (${l.specialistId})${l.intentName ? ` • Intent: ${l.intentName}` : ""}`,
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
          <div style={{ fontSize: "20px", fontWeight: 600 }}>Ticket Activity</div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            See intents, specialist replies, handovers, and errors per ticket.
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

        {/* Main content */}
        <main
          style={{
            flex: 1,
            padding: "16px 24px",
            overflowY: "auto",
          }}
        >
          {isLoading && (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Loading logs…</div>
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
              gap: 12,
              minHeight: "60vh",
            }}
          >
            <div
              style={{
                border: "1px solid #1f2937",
                borderRadius: "12px",
                padding: "12px",
                background: "#0b1220",
                overflowY: "auto",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
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
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: isSelected
                          ? "1px solid #22c55e"
                          : "1px solid #1f2937",
                        background: isSelected ? "#111827" : "#020617",
                        color: "#e5e7eb",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {t.ticketId}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        {t.lastStatus} • {t.count} events
                      </div>
                    </button>
                  );
                })}
                {tickets.length === 0 && !isLoading && (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    No tickets yet.
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                border: "1px solid #1f2937",
                borderRadius: "12px",
                padding: "12px",
                background: "#020617",
                overflowY: "auto",
              }}
            >
              {!selectedTicket && (
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  Select a ticket to view activity.
                </div>
              )}
              {selectedTicket && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    Ticket {selectedTicket}
                  </div>
                  {timeline.length === 0 && (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      No events for this ticket yet.
                    </div>
                  )}
                  {timeline.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        border: "1px solid #1f2937",
                        borderRadius: "8px",
                        padding: "8px",
                        background: "#0b1220",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 4,
                          color: "#9ca3af",
                        }}
                      >
                        <span>{ev.eventType}</span>
                        <span>{new Date(ev.createdAt).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#e5e7eb" }}>
                        {ev.summary}
                      </div>
                      {ev.detail && (
                        <div style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "pre-wrap" }}>
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
