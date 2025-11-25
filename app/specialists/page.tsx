"use client";

import { useState, useEffect } from "react";
import type { TabKey, SpecialistConfig } from "../api/specialists/data";

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<SpecialistConfig[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>();
  const [activeTab, setActiveTab] = useState<TabKey>("data");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSpecialists() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/specialists");
        if (!res.ok) throw new Error("Failed to load specialists");
        const data: SpecialistConfig[] = await res.json();
        setSpecialists(data);
        if (data[0]) setSelectedSpecialistId(data[0].id);
      } catch (e: any) {
        setError(e.message ?? "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    }
    loadSpecialists();
  }, []);

  const selectedSpecialist =
    specialists.find((s) => s.id === selectedSpecialistId) ?? null;

  function updateSelectedSpecialist(partial: Partial<SpecialistConfig>) {
    if (!selectedSpecialist) return;
    setSpecialists((prev) =>
      prev.map((s) =>
        s.id === selectedSpecialist.id ? { ...s, ...partial } : s
      )
    );
  }

  function toggleSpecialistActive(id: string) {
    setSpecialists((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, active: !s.active } : s
      )
    );
  }

  function handleRequiredFieldsChange(value: string) {
    const items = value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    updateSelectedSpecialist({ requiredFields: items });
  }

  async function saveSpecialist() {
    if (!selectedSpecialist) return;
    try {
      setIsSaving(true);
      const res = await fetch("/api/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSpecialist),
      });
      if (!res.ok) throw new Error("Failed to save specialist");
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
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
          <div style={{ fontSize: "20px", fontWeight: 700 }}>AI Specialists</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Manage specialist profiles, data prompts, and routing defaults.
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
            { id: "specialists", label: "AI Specialists", href: "/specialists", active: true },
            { id: "intents", label: "Intents", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
            { id: "integrations", label: "Integrations", href: "/admin/integrations" },
            { id: "logs", label: "Logs", href: "/admin/logs" },
            { id: "test-ai", label: "Test AI", href: "/test-ai" },
            { id: "track", label: "Track", href: "/track" },
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
                  cursor: "pointer",
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
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflowY: "auto",
            background: "#f5f7fb",
          }}
        >
          {isLoading && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>Loading specialists...</div>
          )}
          {error && (
            <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
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
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#111827" }}>
                Specialists
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {specialists.map((s) => {
                  const isSelected = s.id === selectedSpecialistId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSpecialistId(s.id)}
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
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {s.description}
                      </div>
                      <div style={{ fontSize: 11, color: s.active ? "#16a34a" : "#ef4444" }}>
                        {s.active ? "Active" : "Inactive"}
                      </div>
                    </button>
                  );
                })}
                {specialists.length === 0 && !isLoading && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    No specialists yet.
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
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
              }}
            >
              {!selectedSpecialist && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Select a specialist to view details.
                </div>
              )}

              {selectedSpecialist && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedSpecialist.name}</div>
                    <button
                      onClick={() => toggleSpecialistActive(selectedSpecialist.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "999px",
                        border: "1px solid #e5e7eb",
                        background: selectedSpecialist.active ? "#dcfce7" : "#fee2e2",
                        color: selectedSpecialist.active ? "#16a34a" : "#ef4444",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {selectedSpecialist.active ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ fontSize: 12, color: "#6b7280", width: 120 }}>Name</label>
                    <input
                      value={selectedSpecialist.name}
                      onChange={(e) => updateSelectedSpecialist({ name: e.target.value })}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        padding: "8px",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", width: 120 }}>Description</label>
                    <textarea
                      value={selectedSpecialist.description}
                      onChange={(e) => updateSelectedSpecialist({ description: e.target.value })}
                      rows={3}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        padding: "8px",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", width: 120 }}>
                      Knowledge notes
                    </label>
                    <textarea
                      value={(selectedSpecialist as any).knowledge_base_notes ?? selectedSpecialist.knowledgeBaseNotes ?? ""}
                      onChange={(e) =>
                        updateSelectedSpecialist({
                          // keep compatibility with backend naming
                          knowledge_base_notes: e.target.value,
                          // and camelCase for TS type
                          knowledgeBaseNotes: e.target.value,
                        } as any)
                      }
                      rows={3}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        padding: "8px",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", width: 120 }}>
                      Escalation rules
                    </label>
                    <textarea
                      value={(selectedSpecialist as any).escalation_rules ?? selectedSpecialist.escalationRules ?? ""}
                      onChange={(e) =>
                        updateSelectedSpecialist({
                          escalation_rules: e.target.value,
                          escalationRules: e.target.value,
                        } as any)
                      }
                      rows={3}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        padding: "8px",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", width: 120 }}>
                      Personality notes
                    </label>
                    <textarea
                      value={
                        (selectedSpecialist as any).personality_notes ??
                        selectedSpecialist.personalityNotes ??
                        ""
                      }
                      onChange={(e) =>
                        updateSelectedSpecialist({
                          personality_notes: e.target.value,
                          personalityNotes: e.target.value,
                        } as any)
                      }
                      rows={2}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        padding: "8px",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ fontSize: 12, color: "#6b7280", width: 120 }}>
                      Required fields (comma separated)
                    </label>
                    <input
                      value={
                        (selectedSpecialist as any).required_fields?.join(", ") ||
                        selectedSpecialist.requiredFields?.join(", ") ||
                        ""
                      }
                      onChange={(e) => handleRequiredFieldsChange(e.target.value)}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        padding: "8px",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ fontSize: 12, color: "#6b7280", width: 120 }}>
                      Data extraction prompt
                    </label>
                    <textarea
                      value={
                        (selectedSpecialist as any).data_extraction_prompt ??
                        selectedSpecialist.dataExtractionPrompt ??
                        ""
                      }
                      onChange={(e) =>
                        updateSelectedSpecialist({
                          data_extraction_prompt: e.target.value,
                          dataExtractionPrompt: e.target.value,
                        } as any)
                      }
                      rows={4}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        padding: "8px",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "#6b7280", width: 120 }}>Notes</label>
                    <textarea
                      value={
                        (selectedSpecialist as any).knowledge_base_notes ??
                        selectedSpecialist.knowledgeBaseNotes ??
                        ""
                      }
                      onChange={(e) =>
                        updateSelectedSpecialist({
                          knowledge_base_notes: e.target.value,
                          knowledgeBaseNotes: e.target.value,
                        } as any)
                      }
                      rows={2}
                      style={{
                        flex: 1,
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        padding: "8px",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={saveSpecialist}
                      disabled={isSaving}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        border: "none",
                        background: "#4f46e5",
                        color: "#ffffff",
                        fontWeight: 600,
                        cursor: isSaving ? "default" : "pointer",
                        boxShadow: "0 6px 12px rgba(79,70,229,0.2)",
                      }}
                    >
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                    {error && (
                      <div style={{ fontSize: 12, color: "#f97316" }}>
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
