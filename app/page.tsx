export default function Home() {
  const links = [
    { href: "/specialists", title: "AI Specialists", desc: "Manage specialist profiles and prompts." },
    { href: "/admin/intents", title: "Intents", desc: "Configure intents and routing." },
    { href: "/admin/data-extraction", title: "Data Extraction", desc: "Manage extraction templates." },
    { href: "/admin/integrations", title: "Integrations", desc: "Configure external integrations." },
    { href: "/admin/logs", title: "Logs", desc: "View ticket activity and tracking events." },
    { href: "/test-ai", title: "Test AI", desc: "Quickly test the reply flow." },
    { href: "/track", title: "Track", desc: "Lookup parcels and view status history." },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
        background: "#0b1224",
        color: "#e5e7eb",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>Zendesk AI Admin</div>
          <div style={{ color: "#9ca3af", marginTop: 6 }}>
            Jump into specialists, intents, tracking, and logs from one place.
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                textDecoration: "none",
                border: "1px solid #1f2937",
                borderRadius: "12px",
                padding: "16px",
                background: "#0f172a",
                color: "#e5e7eb",
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{link.title}</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>{link.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
