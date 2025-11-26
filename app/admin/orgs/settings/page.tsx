"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "../../../../lib/api-client";

type OrgSettingsPayload = {
  organization: { id: string; name: string; slug: string | null; plan?: string; status?: string };
  settings: { branding?: any; limits?: any; ai_prefs?: any };
};

type Branding = { primaryColor?: string; logoUrl?: string; supportEmail?: string };
type Limits = { maxAutoReplies?: number; dailyLimit?: number };
type AiPrefs = { defaultTone?: string; defaultModel?: string; enableTemplates?: boolean };

const NAV_ITEMS = [
  { id: "home", label: "Home", href: "/" },
  { id: "specialists", label: "AI Specialists", href: "/admin/specialists" },
  { id: "intents", label: "Intents", href: "/admin/intents" },
  { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
  { id: "integrations", label: "Integrations", href: "/admin/integrations" },
  { id: "logs", label: "Logs", href: "/admin/logs" },
  { id: "test-ai", label: "Test AI", href: "/admin/test-ai" },
  { id: "track", label: "Track", href: "/admin/track" },
  { id: "orgs", label: "Org & Members", href: "/admin/orgs" },
  { id: "org-settings", label: "Org Settings", href: "/admin/orgs/settings", active: true },
];

function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, color: "#111827" }}>{title}</div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export default function OrgSettingsPage() {
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [branding, setBranding] = useState<Branding>({});
  const [limits, setLimits] = useState<Limits>({});
  const [aiPrefs, setAiPrefs] = useState<AiPrefs>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const nav = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        active: item.id === "org-settings",
      })),
    []
  );

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch("/api/org-settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = (await res.json()) as OrgSettingsPayload;
        setOrgName(data.organization?.name || "");
        setOrgSlug(data.organization?.slug || "");
        setBranding(data.settings?.branding || {});
        setLimits(data.settings?.limits || {});
        setAiPrefs(data.settings?.ai_prefs || {});
      } catch (e: any) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const res = await apiFetch("/api/org-settings", {
        method: "POST",
        body: JSON.stringify({
          name: orgName,
          slug: orgSlug,
          branding,
          limits,
          aiPrefs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to save");
        return;
      }
      setMessage("Saved");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

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
          gap: 8,
          background: "#f9fafb",
        }}
      >
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>Navigation</div>
        {nav.map((item) => (
          <a key={item.id} href={item.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                background: item.active ? "#eef2ff" : "transparent",
                color: item.active ? "#1f2937" : "#6b7280",
                fontWeight: item.active ? 700 : 500,
                border: item.active ? "1px solid #c7d2fe" : "1px solid transparent",
              }}
            >
              {item.label}
            </div>
          </a>
        ))}
      </aside>

      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Organization settings</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Update org name/slug, branding, AI defaults, and limits.
          </div>
        </div>

        {error && (
          <div style={{ color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 10 }}>{error}</div>
        )}
        {message && (
          <div style={{ color: "#166534", background: "#dcfce7", padding: 12, borderRadius: 10 }}>{message}</div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Card
            title="Org profile"
            actions={
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #c7d2fe",
                  background: "#eef2ff",
                  color: "#1d4ed8",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Name</div>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Support"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Slug</div>
                <input
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="acme-support"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          </Card>

          <Card title="Branding & Contact">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Primary color</div>
                <input
                  value={branding.primaryColor || ""}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  placeholder="#4f46e5"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Logo URL</div>
                <input
                  value={branding.logoUrl || ""}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Support email</div>
                <input
                  value={branding.supportEmail || ""}
                  onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
                  placeholder="support@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          </Card>

          <Card title="AI defaults">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Default model</div>
                <input
                  value={aiPrefs.defaultModel || ""}
                  onChange={(e) => setAiPrefs({ ...aiPrefs, defaultModel: e.target.value })}
                  placeholder="gpt-4.1-mini"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Default tone</div>
                <input
                  value={aiPrefs.defaultTone || ""}
                  onChange={(e) => setAiPrefs({ ...aiPrefs, defaultTone: e.target.value })}
                  placeholder="Friendly, concise"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={!!aiPrefs.enableTemplates}
                  onChange={(e) => setAiPrefs({ ...aiPrefs, enableTemplates: e.target.checked })}
                />
                Enable templates
              </label>
            </div>
          </Card>

          <Card title="Limits">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Max auto replies/day</div>
                <input
                  type="number"
                  value={limits.maxAutoReplies ?? ""}
                  onChange={(e) => setLimits({ ...limits, maxAutoReplies: Number(e.target.value) || 0 })}
                  placeholder="100"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Daily token limit</div>
                <input
                  type="number"
                  value={limits.dailyLimit ?? ""}
                  onChange={(e) => setLimits({ ...limits, dailyLimit: Number(e.target.value) || 0 })}
                  placeholder="100000"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
