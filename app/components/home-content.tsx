"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";

const NAV_ITEMS = [
  { id: "home", label: "Home", href: "/" },
  { id: "specialists", label: "AI Specialists", href: "/admin/specialists" },
  { id: "intents", label: "Intents", href: "/admin/intents" },
  { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
  { id: "integrations", label: "Integrations", href: "/admin/integrations" },
  { id: "logs", label: "Logs", href: "/admin/logs" },
  { id: "test-ai", label: "Test AI", href: "/admin/test-ai" },
  { id: "track", label: "Track", href: "/admin/track" },
];

export default function HomeContent() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
        background: "#f5f7fb",
        color: "#111827",
        position: "relative",
      }}
    >
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
          Workspace
        </div>
        {NAV_ITEMS.map((item) => (
          <a key={item.id} href={item.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "13px",
                background: item.id === "home" ? "#eef2ff" : "transparent",
                color: item.id === "home" ? "#1f2937" : "#6b7280",
                fontWeight: item.id === "home" ? 600 : 500,
                border: item.id === "home" ? "1px solid #c7d2fe" : "1px solid transparent",
              }}
            >
              {item.label}
            </div>
          </a>
        ))}
      </aside>

      <div
        style={{
          flex: 1,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <header
          style={{
            paddingBottom: 8,
            borderBottom: "1px solid #e5e7eb",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>Welcome</div>
            <div style={{ color: "#6b7280", marginTop: 4 }}>
              Quick links and setup notes for your AI workspace.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a
              href="/admin/orgs"
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #c7d2fe",
                background: "#eef2ff",
                color: "#1d4ed8",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Org & Members
            </a>
            <a
              href="/admin/orgs/settings"
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#111827",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Org Settings
            </a>
          </div>
        </header>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#ffffff",
            boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
            maxWidth: 900,
            lineHeight: 1.6,
            fontSize: 14,
          }}
        >
          <p style={{ marginBottom: 12 }}>
            Use the navigation on the left to configure AI specialists, intents, data extraction, integrations,
            and to review logs, run tests, or track parcels.
          </p>
          <p style={{ marginBottom: 12, color: "#374151" }}>
            Next steps:
          </p>
          <ul style={{ margin: "0 0 12px 18px", color: "#4b5563" }}>
            <li>Confirm environment keys (Parcelsapp, OpenAI, Supabase).</li>
            <li>Build out AI Specialists with knowledge and escalation notes.</li>
            <li>Map intents to specialists; test flows under Test AI.</li>
            <li>Track parcels under Track and review recent activity in Logs.</li>
          </ul>
          <p style={{ marginBottom: 0, color: "#6b7280" }}>
            This page is a setup hub—check back as we expand onboarding guidance.
          </p>
        </div>
      </div>

      <button
        onClick={async () => {
          await supabaseBrowser.auth.signOut();
          router.replace("/login");
        }}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          color: "#111827",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Sign out
      </button>
    </div>
  );
}
