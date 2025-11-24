"use client";

import { useEffect, useState } from "react";
import type { DataField } from "../../api/data-extraction/types";

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
        const res = await fetch("/api/data-extraction");
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
      const res = await fetch("/api/data-extraction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/data-extraction/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/data-extraction/${selected.id}`, {
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
        background: "#020617",
        color: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
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
          <div style={{ fontSize: "20px", fontWeight: 600 }}>Data Extraction</div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            Define the fields to extract (e.g., email, tracking number, address).
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
            { id: "specialists", label: "AI Specialists", href: "/admin" },
            { id: "intents", label: "Intents & Routing", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction", active: true },
            { id: "integrations", label: "Integrations", href: "/admin/integrations" },
            { id: "logs", label: "Logs", href: "/admin/logs" },
          ].map((item) => (
            <a
              key={item.id}
              href={item.href}
              style={{ textDecoration: "none" }}
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

        <main
          style={{
            flex: 1,
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 16,
            overflow: "hidden",
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
              Fields
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
              Define what to extract and show an example.
            </div>
            {isLoading && (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
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
                      {field.label} {field.required ? "(required)" : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      {field.name}
                    </div>
                  </button>
                );
              })}
              {fields.length === 0 && !isLoading && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  No fields yet. Create one to start extracting data.
                </div>
              )}
              <button
                onClick={handleCreateField}
                disabled={isSaving}
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px dashed #374151",
                  background: "transparent",
                  cursor: isSaving ? "default" : "pointer",
                  fontSize: "13px",
                  color: "#9ca3af",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                + Create Field
              </button>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "14px",
              background: "#020617",
              overflowY: "auto",
            }}
          >
            {!selected && (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
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
                      border: "1px solid #374151",
                      background: "#020617",
                      color: "#e5e7eb",
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
                      border: "1px solid #374151",
                      background: "#020617",
                      color: "#e5e7eb",
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
                      border: "1px solid #374151",
                      background: "#020617",
                      color: "#e5e7eb",
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
                      border: "1px solid #374151",
                      background: "#020617",
                      color: "#e5e7eb",
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
                      background: "#22c55e",
                      color: "#020617",
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
                      background: "transparent",
                      color: "#ef4444",
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
