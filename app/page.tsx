export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
        background: "#0b1224",
        color: "#e5e7eb",
      }}
    >
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            width: "220px",
            borderRight: "1px solid #1f2937",
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "#0f172a",
          }}
        >
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: 8, fontWeight: 600 }}>
            Navigation
          </div>
          {[
            { id: "specialists", label: "AI Specialists", href: "/specialists" },
            { id: "intents", label: "Intents", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
            { id: "integrations", label: "Integrations", href: "/admin/integrations" },
            { id: "logs", label: "Logs", href: "/admin/logs" },
            { id: "test-ai", label: "Test AI", href: "/test-ai" },
            { id: "track", label: "Track", href: "/track" },
          ].map((item) => (
            <a key={item.id} href={item.href} style={{ textDecoration: "none" }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "13px",
                  background: "transparent",
                  color: "#e5e7eb",
                  fontWeight: 600,
                  border: "1px solid #1f2937",
                  transition: "background 0.15s",
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
            padding: "32px 24px",
            background: "#0b1224",
          }}
        >
          <header style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>Zendesk AI Admin</div>
            <div style={{ color: "#9ca3af", marginTop: 6 }}>
              Welcome. Use the navigation to manage specialists, intents, integrations, logs, tests, and tracking.
            </div>
          </header>

          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "16px",
              background: "#0f172a",
              color: "#e5e7eb",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              fontSize: 14,
              lineHeight: 1.5,
              maxWidth: 700,
            }}
          >
            <p style={{ marginBottom: 12 }}>
              This will become a welcome/setup page. For now, it mirrors the admin layout so you can navigate quickly.
            </p>
            <p style={{ marginBottom: 12 }}>
              Suggestions:
              <ul style={{ margin: "8px 0 0 16px", color: "#cbd5e1" }}>
                <li>Confirm your API keys and environment settings.</li>
                <li>Set up AI Specialists with knowledge and escalation rules.</li>
                <li>Wire intents to the right specialists.</li>
                <li>Use Track to check parcel statuses and Logs to view ticket history.</li>
              </ul>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
