"use client";

import { useEffect, useState } from "react";
import type { DataField } from "../../api/data-extraction/types";
import { apiFetch } from "../../../lib/api-client";

export default function DataExtractionPage() {
  const [fields, setFields] = useState<DataField[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFields() {
      try {
        setIsLoading(true);
        const res = await apiFetch("/api/data-extraction");
        if (!res.ok) throw new Error("Failed to load fields");
        const data: DataField[] = await res.json();
        setFields(data);
        if (data[0]) setSelectedId(data[0].id);
      } catch (e: any) {
        setError(e.message ?? "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    }
    loadFields();
  }, []);

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  function updateSelected(partial: Partial<DataField>) {
    if (!selected) return;
    setFields((prev) =>
      prev.map((f) => (f.id === selected.id ? { ...f, ...partial } : f))
    );
  }

  async function handleCreateField() {
    const draft: Partial<DataField> = {
      name: "new_field",
      label: "New Field",
      description: "",
      example: "",
      required: false,
    };
    try {
      setIsSaving(true);
      setError(null);
      const res = await apiFetch("/api/data-extraction", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to create field");
      const created: DataField = await res.json();
      setFields((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while creating field");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSelectedField() {
    if (!selected) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await apiFetch(`/api/data-extraction/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify(selected),
      });
      if (!res.ok) throw new Error("Failed to save field");
      const updated: DataField = await res.json();
      setFields((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while saving field");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteField() {
    if (!selected) return;
    const confirmed = window.confirm(
      `Delete field "${selected.label}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await apiFetch(`/api/data-extraction/${selected.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete field");
      setFields((prev) => {
        const remaining = prev.filter((f) => f.id !== selected.id);
        setSelectedId(remaining[0]?.id);
        return remaining;
      });
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while deleting field");
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
          <div style={{ fontSize: "20px", fontWeight: 700 }}>Data Extraction</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Define the fields to extract (e.g., email, tracking number, address).
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
            { id: "home", label: "Home", href: "/" },
            { id: "specialists", label: "AI Specialists", href: "/admin/specialists" },
            { id: "intents", label: "Intents", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction", active: true },
            { id: "integrations", label: "Integrations", href: "/admin/integrations" },
            { id: "logs", label: "Logs", href: "/admin/logs" },
            { id: "test-ai", label: "Test AI", href: "/admin/test-ai" },
            { id: "track", label: "Track", href: "/admin/track" },
          ].map((item) => (
            <a
              key={item.id}
              href={item.href}
              style={{ textDecoration: "none" }}
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
              boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Fields
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
              Define what to extract and show an example.
            </div>
            {isLoading && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Loading fields…
              </div>
            )}
            {error && (
              <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {fields.map((field) => {
                const isSelected = field.id === selectedId;
                return (
                  <button
                    key={field.id}
                    onClick={() => setSelectedId(field.id)}
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
                      {field.label} {field.required ? "(required)" : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {field.name}
                    </div>
                  </button>
                );
              })}
              {fields.length === 0 && !isLoading && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  No fields yet. Create one to start extracting data.
                </div>
              )}
              <button
                onClick={handleCreateField}
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
                + Create Field
              </button>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "14px",
              background: "#ffffff",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
            }}
          >
            {!selected && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Select a field to edit.
              </div>
            )}
            {selected && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Label</div>
                  <input
                    value={selected.label}
                    onChange={(e) => updateSelected({ label: e.target.value })}
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
                  <div style={{ fontSize: 13, marginBottom: 4 }}>
                    Field key (used in backend)
                  </div>
                  <input
                    value={selected.name}
                    onChange={(e) =>
                      updateSelected({ name: e.target.value.trim() })
                    }
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
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Description</div>
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
                <div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Example value</div>
                  <input
                    value={selected.example}
                    onChange={(e) =>
                      updateSelected({ example: e.target.value })
                    }
                    placeholder="e.g., order_12345"
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
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selected.required}
                    onChange={(e) =>
                      updateSelected({ required: e.target.checked })
                    }
                  />
                  <span style={{ fontSize: 13 }}>Required</span>
                </label>

                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button
                    onClick={saveSelectedField}
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
                    Save field
                  </button>
                  <button
                    onClick={handleDeleteField}
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
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
