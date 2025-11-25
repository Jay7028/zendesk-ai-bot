"use client";

import { useEffect, useState } from "react";
import type { IntegrationConfig } from "../../api/integrations/types";

export default function IntegrationsPage() {
  const [items, setItems] = useState<IntegrationConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadItems() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/integrations");
        if (!res.ok) throw new Error("Failed to load integrations");
        const data: IntegrationConfig[] = await res.json();
        setItems(data);
        if (data[0]) setSelectedId(data[0].id);
      } catch (e: any) {
        setError(e.message ?? "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    }
    loadItems();
  }, []);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  function updateSelected(partial: Partial<IntegrationConfig>) {
    if (!selected) return;
    setItems((prev) =>
      prev.map((i) => (i.id === selected.id ? { ...i, ...partial } : i))
    );
  }

  async function handleCreate() {
    const draft: Partial<IntegrationConfig> = {
      name: "New Integration",
      type: "custom",
      description: "",
      apiKey: "",
      baseUrl: "",
      enabled: false,
    };
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to create integration");
      const created: IntegrationConfig = await res.json();
      setItems((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while creating");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSelected() {
    if (!selected) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/integrations/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (!res.ok) throw new Error("Failed to save integration");
      const updated: IntegrationConfig = await res.json();
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while saving");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const confirmed = window.confirm(
      `Delete integration "${selected.name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/integrations/${selected.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete integration");
      setItems((prev) => {
        const remaining = prev.filter((i) => i.id !== selected.id);
        setSelectedId(remaining[0]?.id);
        return remaining;
      });
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while deleting");
    } finally {
      setIsSaving(false);
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
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>Integrations</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Manage API keys and endpoints (OpenAI, Zendesk, etc.). Note: store secrets securely.
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          Environment: <span style={{ color: "#22c55e", fontWeight: 600 }}>Development</span>
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
            { id: "integrations", label: "Integrations", href: "/admin/integrations", active: true },
            { id: "logs", label: "Logs", href: "/admin/logs" },
            { id: "test-ai", label: "Test AI", href: "/admin/test-ai" },
            { id: "track", label: "Track", href: "/admin/track" },
          ].map((item) => (
            <a key={item.id} href={item.href} style={{ textDecoration: "none" }}>
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

        <main
          style={{
            flex: 1,
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 16,
            overflow: "hidden",
            background: "#f5f7fb",
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
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Integrations
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
              Store API base URLs and keys (e.g., OpenAI, Zendesk). Avoid production secrets in client-side code.
            </div>
            {isLoading && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Loading integrations…
              </div>
            )}
            {error && (
              <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
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
                      {item.name} {item.enabled ? "(enabled)" : "(disabled)"}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      {item.type}
                    </div>
                  </button>
                );
              })}
              {items.length === 0 && !isLoading && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  No integrations yet. Create one to get started.
                </div>
              )}
              <button
                onClick={handleCreate}
                disabled={isSaving}
                style={{
                  marginTop: 8,
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px dashed #d1d5db",
                  background: "#ffffff",
                  cursor: isSaving ? "default" : "pointer",
                  fontSize: "13px",
                  color: "#6b7280",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                + Create Integration
              </button>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              background: "#ffffff",
              boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {!selected && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Select an integration to edit.
              </div>
            )}
            {selected && (
              <>
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                    Integration details
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Configure endpoints and keys for this provider.
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 4, color: "#374151" }}>
                      Name
                    </div>
                    <input
                      value={selected.name}
                      onChange={(e) => updateSelected({ name: e.target.value })}
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        color: "#111827",
                        padding: "8px",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 4, color: "#374151" }}>
                      Type
                    </div>
                    <input
                      value={selected.type}
                      onChange={(e) => updateSelected({ type: e.target.value })}
                      placeholder="openai, zendesk, custom"
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        color: "#111827",
                        padding: "8px",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 4, color: "#374151" }}>
                      Base URL
                    </div>
                    <input
                      value={selected.baseUrl}
                      onChange={(e) => updateSelected({ baseUrl: e.target.value })}
                      placeholder="https://api.example.com"
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        color: "#111827",
                        padding: "8px",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 4, color: "#374151" }}>
                      API Key (stored in DB; prefer env vars for prod)
                    </div>
                    <input
                      value={selected.apiKey}
                      onChange={(e) => updateSelected({ apiKey: e.target.value })}
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        color: "#111827",
                        padding: "8px",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 4, color: "#374151" }}>
                      Description
                    </div>
                    <textarea
                      value={selected.description}
                      onChange={(e) =>
                        updateSelected({ description: e.target.value })
                      }
                      rows={3}
                      style={{
                        width: "100%",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        color: "#111827",
                        padding: "8px",
                        fontSize: "12px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#111827",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.enabled}
                      onChange={(e) =>
                        updateSelected({ enabled: e.target.checked })
                      }
                    />
                    <span>Enabled</span>
                  </label>

                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button
                      onClick={saveSelected}
                      disabled={isSaving}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "999px",
                        border: "none",
                        cursor: isSaving ? "default" : "pointer",
                        background: "#6366f1",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                        opacity: isSaving ? 0.7 : 1,
                      }}
                    >
                      Save integration
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isSaving}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "999px",
                        border: "1px solid #ef4444",
                        background: "#fff5f5",
                        color: "#b91c1c",
                        cursor: isSaving ? "default" : "pointer",
                        fontSize: "12px",
                        fontWeight: 600,
                        opacity: isSaving ? 0.7 : 1,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
