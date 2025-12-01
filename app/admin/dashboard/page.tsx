"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api-client";

type LogStatus = "success" | "fallback" | "escalated";
type LogEntry = {
  id: string;
  timestamp: string;
  zendeskTicketId: string;
  specialistName: string;
  intentName?: string | null;
  status: LogStatus;
};

type TicketEvent = {
  id: string;
  ticketId: string;
  eventType: string;
  summary: string;
  createdAt: string;
};

type RangeKey = "7d" | "30d" | "all";

export default function DashboardPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("7d");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [logRes, eventRes] = await Promise.all([apiFetch("/api/logs"), apiFetch("/api/ticket-events")]);
        if (!logRes.ok) throw new Error("Failed to load logs");
        if (!eventRes.ok) throw new Error("Failed to load ticket events");
        setLogs(await logRes.json());
        setEvents(await eventRes.json());
      } catch (e: any) {
        setError(e.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (range === "all") return { logs, events };
    const now = Date.now();
    const cutoff = range === "7d" ? now - 7 * 24 * 60 * 60 * 1000 : now - 30 * 24 * 60 * 60 * 1000;
    return {
      logs: logs.filter((l) => new Date(l.timestamp).getTime() >= cutoff),
      events: events.filter((e) => new Date(e.createdAt).getTime() >= cutoff),
    };
  }, [logs, events, range]);

  const stats = useMemo(() => {
    const uniqueTickets = new Set(filtered.logs.map((l) => l.zendeskTicketId));
    const totals = {
      tickets: uniqueTickets.size,
      messages: filtered.logs.length,
      success: filtered.logs.filter((l) => l.status === "success").length,
      fallback: filtered.logs.filter((l) => l.status === "fallback").length,
      escalated: filtered.logs.filter((l) => l.status === "escalated").length,
    };
    const sentPerEnquiry = totals.tickets ? (totals.messages / totals.tickets).toFixed(1) : "0.0";

    const intents = new Map<string, number>();
    filtered.logs.forEach((l) => {
      const name = l.intentName || "Unknown";
      intents.set(name, (intents.get(name) ?? 0) + 1);
    });
    const topIntents = Array.from(intents.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const specialists = new Map<string, number>();
    filtered.logs.forEach((l) => {
      specialists.set(l.specialistName, (specialists.get(l.specialistName) ?? 0) + 1);
    });
    const topSpecialists = Array.from(specialists.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const docShares = filtered.events.filter((e) => e.eventType === "document_shared").length;
    const handovers = filtered.events.filter((e) => e.eventType === "zendesk_update" && e.summary?.includes("handover")).length;

    const uncaptured = filtered.logs
      .filter((l) => !l.intentName || l.intentName.toLowerCase() === "unknown")
      .map((l) => ({
        ticketId: l.zendeskTicketId,
        when: l.timestamp,
        status: l.status,
      }));

    return { totals, sentPerEnquiry, topIntents, topSpecialists, docShares, handovers, uncaptured };
  }, [filtered]);

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#ffffff",
        boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
        padding: 16,
        width: "100%",
      }}
    >
      <div style={{ fontWeight: 700, color: "#111827", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  const SummaryStat = ({ label, value }: { label: string; value: string | number }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
      <div style={{ color: "#6b7280", fontSize: 12 }}>{label}</div>
    </div>
  );

  if (loading) {
    return <div style={{ padding: 24, color: "#6b7280" }}>Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "#b91c1c" }}>
        Failed to load dashboard: {error}
      </div>
    );
  }

  const leftNavItems = [
    { id: "home", label: "Home", href: "/", active: false },
    { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", active: true },
    { id: "specialists", label: "AI Specialists", href: "/admin/specialists" },
    { id: "intents", label: "Intents", href: "/admin/intents" },
    { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
    { id: "integrations", label: "Integrations", href: "/admin/integrations" },
    { id: "logs", label: "Logs", href: "/admin/logs" },
    { id: "test-ai", label: "Test AI", href: "/admin/test-ai" },
    { id: "track", label: "Track", href: "/admin/track" },
    { id: "orgs", label: "Org & Members", href: "/admin/orgs" },
    { id: "org-settings", label: "Org Settings", href: "/admin/orgs/settings" },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f5f7fb",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
        color: "#111827",
      }}
    >
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #e5e7eb",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15, padding: "4px 8px" }}>AI Admin</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {leftNavItems.map((item) => (
            <a key={item.id} href={item.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: item.active ? "#eef2ff" : "transparent",
                  color: item.active ? "#1d4ed8" : "#374151",
                  border: item.active ? "1px solid #c7d2fe" : "1px solid transparent",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {item.label}
              </div>
            </a>
          ))}
        </div>
      </aside>

      <div style={{ flex: 1, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Dashboard</div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Overview of ticket volume, automation, and knowledge usage.</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Range:</span>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <Card title="Tickets">
            <SummaryStat label="Unique tickets" value={stats.totals.tickets} />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              Avg messages per enquiry: {stats.sentPerEnquiry}
            </div>
          </Card>
          <Card title="Automation outcomes">
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <SummaryStat label="Auto-resolved" value={stats.totals.success} />
              <SummaryStat label="Escalated" value={stats.totals.escalated} />
              <SummaryStat label="Fallback" value={stats.totals.fallback} />
            </div>
          </Card>
          <Card title="Knowledge/doc usage">
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <SummaryStat label="Total bot messages" value={stats.totals.messages} />
              <SummaryStat label="Documents shared" value={stats.docShares} />
            </div>
          </Card>
          <Card title="Handover">
            <SummaryStat label="Handover events" value={stats.handovers} />
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 14 }}>
          <Card title="Top intents">
            {stats.topIntents.length === 0 && <div style={{ color: "#6b7280", fontSize: 13 }}>No intents yet.</div>}
            {stats.topIntents.map(([name, count]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}>
                <span>{name}</span>
                <span style={{ color: "#6b7280" }}>{count}</span>
              </div>
            ))}
          </Card>
          <Card title="Top specialists">
            {stats.topSpecialists.length === 0 && <div style={{ color: "#6b7280", fontSize: 13 }}>No specialists yet.</div>}
            {stats.topSpecialists.map(([name, count]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}>
                <span>{name}</span>
                <span style={{ color: "#6b7280" }}>{count}</span>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 14 }}>
          <Card title="Uncaptured intents">
            {stats.uncaptured.length === 0 && (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No uncaptured tickets in this range.</div>
            )}
            {stats.uncaptured.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px", gap: 8, fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                <div>Ticket</div>
                <div>When</div>
                <div>Status</div>
              </div>
            )}
            {stats.uncaptured.slice(0, 10).map((row) => (
              <div
                key={`${row.ticketId}-${row.when}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 140px",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: 13,
                }}
              >
                <div>{row.ticketId}</div>
                <div style={{ color: "#374151" }}>{new Date(row.when).toLocaleString()}</div>
                <div>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      background:
                        row.status === "success"
                          ? "#dcfce7"
                          : row.status === "escalated"
                          ? "#fef9c3"
                          : "#fee2e2",
                      color:
                        row.status === "success"
                          ? "#166534"
                          : row.status === "escalated"
                          ? "#854d0e"
                          : "#991b1b",
                      border: "1px solid #e5e7eb",
                      fontWeight: 700,
                    }}
                  >
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ marginTop: 14 }}>
          <Card title="Recent tickets">
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 140px 100px", gap: 8, fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              <div>Ticket</div>
              <div>Intent / Specialist</div>
              <div>When</div>
              <div>Status</div>
            </div>
            {filtered.logs.slice(0, 10).map((l) => (
              <div
                key={l.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 140px 100px",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: 13,
                }}
              >
                <div>{l.zendeskTicketId}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{l.intentName || "Unknown intent"}</div>
                  <div style={{ color: "#6b7280" }}>{l.specialistName}</div>
                </div>
                <div style={{ color: "#6b7280" }}>{new Date(l.timestamp).toLocaleString()}</div>
                <div>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      background:
                        l.status === "success"
                          ? "#dcfce7"
                          : l.status === "escalated"
                          ? "#fef9c3"
                          : "#fee2e2",
                      color:
                        l.status === "success"
                          ? "#166534"
                          : l.status === "escalated"
                          ? "#854d0e"
                          : "#991b1b",
                      border: "1px solid #e5e7eb",
                      fontWeight: 700,
                    }}
                  >
                    {l.status}
                  </span>
                </div>
              </div>
            ))}
            {filtered.logs.length === 0 && <div style={{ color: "#6b7280", fontSize: 13 }}>No activity in this range.</div>}
          </Card>
        </div>
      </div>
    </main>
  );
}
