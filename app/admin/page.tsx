"use client";

import { useState, useEffect } from "react";
import type { TabKey, SpecialistConfig } from "../api/specialists/data";

export default function AiSpecialistsAdminPage() {
  const [specialists, setSpecialists] = useState<SpecialistConfig[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>();
  const [activeTab, setActiveTab] = useState<TabKey>("data");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load specialists from API
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

  async function saveSelectedSpecialist() {
    if (!selectedSpecialist) return;
    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch(`/api/specialists/${selectedSpecialist.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSpecialist),
      });

      if (!res.ok) throw new Error("Failed to save specialist");
      const updated: SpecialistConfig = await res.json();

      setSpecialists((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while saving");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateSpecialist() {
    const draft: Omit<SpecialistConfig, "id"> = {
      name: "New Specialist",
      description: "Describe what this specialist handles.",
      active: false,
      docsCount: 0,
      rulesCount: 0,
      dataExtractionPrompt: "",
      requiredFields: [],
      knowledgeBaseNotes: "",
      escalationRules: "",
      personalityNotes: "",
    };

    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch("/api/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to create specialist");

      const created: SpecialistConfig = await res.json();
      setSpecialists((prev) => [...prev, created]);
      setSelectedSpecialistId(created.id);
      setActiveTab("data");
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while creating");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSelectedSpecialist() {
    if (!selectedSpecialist) return;
    const confirmed = window.confirm(
      `Delete "${selectedSpecialist.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch(`/api/specialists/${selectedSpecialist.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete specialist");

      setSpecialists((prev) => {
        const remaining = prev.filter((s) => s.id !== selectedSpecialist.id);
        setSelectedSpecialistId(remaining[0]?.id);
        return remaining;
      });
      setActiveTab("data");
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
      {/* Top bar */}
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
            Manage knowledge, rules and personality for each specialist.
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
            { id: "specialists", label: "AI Specialists", href: "/admin", active: true },
            { id: "intents", label: "Intents & Routing", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
            { id: "integrations", label: "Integrations", href: "/admin/integrations" },
            { id: "logs", label: "Logs", href: "/admin/logs" },
            { id: "test-ai", label: "Test AI", href: "/test-ai" },
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

        {/* Specialists sidebar + main content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Secondary sidebar: Your Specialists */}
          <aside
            style={{
              width: "260px",
              borderRight: "1px solid #e5e7eb",
              padding: "16px",
              overflowY: "auto",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              Your Specialists
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: 12 }}>
              Manage the bots that handle different scenarios.
            </div>

            {isLoading && (
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                Loading specialists…
              </div>
            )}
            {error && (
              <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
                {error}
              </div>
            )}

            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {specialists.map((spec) => {
                const isSelected = spec.id === selectedSpecialistId;
                return (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setSelectedSpecialistId(spec.id);
                      setActiveTab("data");
                    }}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: isSelected
                        ? "1px solid #c7d2fe"
                        : "1px solid #e5e7eb",
                      background: isSelected ? "#eef2ff" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      boxShadow: isSelected
                        ? "0 4px 10px rgba(99,102,241,0.1)"
                        : "0 1px 4px rgba(15,23,42,0.06)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {spec.name}
                    </span>
                    <span
                      style={{ fontSize: "11px", color: "#6b7280" }}
                    >{`${spec.docsCount} docs · ${spec.rulesCount} rules`}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: spec.active ? "#16a34a" : "#f59e0b",
                      }}
                    >
                      {spec.active ? "Active" : "Inactive"}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={handleCreateSpecialist}
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
                + Create Specialist
              </button>
            </div>
          </aside>

          {/* Main specialist configuration area */}
          <main
            style={{
              flex: 1,
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              overflowY: "auto",
              background: "#f5f7fb",
            }}
          >
            {!selectedSpecialist && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                No specialists available yet.
              </div>
            )}

            {selectedSpecialist && (
              <>
                {/* Specialist header */}
                <section
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    padding: "16px",
                    background: "#ffffff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                  }}
                >
                  <div>
                    <input
                      value={selectedSpecialist.name}
                      onChange={(e) =>
                        updateSelectedSpecialist({ name: e.target.value })
                      }
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        marginBottom: 4,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        color: "#111827",
                      }}
                    />
                    <textarea
                      value={selectedSpecialist.description}
                      onChange={(e) =>
                        updateSelectedSpecialist({ description: e.target.value })
                      }
                      rows={2}
                      style={{
                        width: "100%",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: 4,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        resize: "vertical",
                      }}
                    />
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {selectedSpecialist.docsCount} training docs ·{" "}
                      {selectedSpecialist.rulesCount} rules
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => toggleSpecialistActive(selectedSpecialist.id)}
                      disabled={isSaving}
                      style={{
                        fontSize: "12px",
                        padding: "8px 16px",
                        borderRadius: "999px",
                        border: "1px solid transparent",
                        cursor: isSaving ? "default" : "pointer",
                        background: selectedSpecialist.active
                          ? "#22c55e"
                          : "#e5e7eb",
                        color: selectedSpecialist.active ? "#ffffff" : "#374151",
                        fontWeight: 600,
                        opacity: isSaving ? 0.7 : 1,
                      }}
                    >
                      {selectedSpecialist.active ? "Active" : "Inactive"}
                    </button>
                    <button
                      onClick={handleDeleteSelectedSpecialist}
                      disabled={isSaving}
                      style={{
                        fontSize: "12px",
                        padding: "8px 16px",
                        borderRadius: "999px",
                        border: "1px solid #ef4444",
                        background: "#fff5f5",
                        color: "#b91c1c",
                        cursor: isSaving ? "default" : "pointer",
                        fontWeight: 600,
                        opacity: isSaving ? 0.7 : 1,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </section>

                {/* Tabs */}
                <section
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      borderBottom: "1px solid #e5e7eb",
                      padding: "0 16px",
                      gap: 12,
                    }}
                  >
                    {[
                      { key: "data", label: "Data Extraction" },
                      { key: "knowledge", label: "Knowledge Base" },
                      { key: "escalation", label: "Escalation Rules" },
                      { key: "personality", label: "Personality" },
                    ].map((tab) => {
                      const isActive = activeTab === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key as TabKey)}
                          style={{
                            padding: "12px 10px",
                            marginRight: 8,
                            border: "none",
                            borderBottom: isActive
                              ? "2px solid #6366f1"
                              : "2px solid transparent",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: "13px",
                            color: isActive ? "#111827" : "#6b7280",
                            fontWeight: isActive ? 600 : 500,
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ padding: "16px", fontSize: "13px" }}>
                    {activeTab === "data" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(0, 1.4fr) minmax(0, 1fr)",
                          gap: 16,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              marginBottom: 8,
                            }}
                          >
                            What data should this specialist extract?
                          </div>
                          <textarea
                            value={selectedSpecialist.dataExtractionPrompt}
                            onChange={(e) =>
                              updateSelectedSpecialist({
                                dataExtractionPrompt: e.target.value,
                              })
                            }
                            rows={6}
                            style={{
                              width: "100%",
                              resize: "vertical",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              background: "#f9fafb",
                              color: "#111827",
                              padding: "8px",
                              fontSize: "12px",
                            }}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 500,
                              marginBottom: 4,
                            }}
                          >
                            Required fields (comma-separated)
                          </div>
                          <input
                            type="text"
                            value={selectedSpecialist.requiredFields.join(", ")}
                            onChange={(e) =>
                              handleRequiredFieldsChange(e.target.value)
                            }
                            placeholder="order_number, email, refund_reason"
                            style={{
                              width: "100%",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              background: "#f9fafb",
                              color: "#111827",
                              padding: "8px",
                              fontSize: "12px",
                              marginBottom: 8,
                            }}
                          />
                          <div
                            style={{ fontSize: "11px", color: "#9ca3af" }}
                          >
                            This tells the AI and backend which pieces of
                            information must be captured before the flow can
                            continue.
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "knowledge" && (
                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            marginBottom: 8,
                          }}
                        >
                          Knowledge base notes
                        </div>
                        <textarea
                          value={selectedSpecialist.knowledgeBaseNotes}
                          onChange={(e) =>
                            updateSelectedSpecialist({
                              knowledgeBaseNotes: e.target.value,
                            })
                          }
                          rows={8}
                          style={{
                            width: "100%",
                            resize: "vertical",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            background: "#f9fafb",
                            color: "#111827",
                            padding: "8px",
                            fontSize: "12px",
                            marginBottom: 8,
                          }}
                        />
                        <div
                          style={{ fontSize: "11px", color: "#9ca3af" }}
                        >
                          Later this will be wired to document upload and
                          embeddings (PDF, TXT, CSV, etc.).
                        </div>
                      </div>
                    )}

                    {activeTab === "escalation" && (
                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            marginBottom: 8,
                          }}
                        >
                          Escalation rules
                        </div>
                        <textarea
                          value={selectedSpecialist.escalationRules}
                          onChange={(e) =>
                            updateSelectedSpecialist({
                              escalationRules: e.target.value,
                            })
                          }
                          rows={8}
                          style={{
                            width: "100%",
                            resize: "vertical",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            background: "#f9fafb",
                            color: "#111827",
                            padding: "8px",
                            fontSize: "12px",
                            marginBottom: 8,
                          }}
                        />
                        <div
                          style={{ fontSize: "11px", color: "#9ca3af" }}
                        >
                          Define when this specialist should hand off to a
                          human or another queue (value thresholds, sentiment,
                          legal risk, etc.).
                        </div>
                      </div>
                    )}

                    {activeTab === "personality" && (
                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 500,
                            marginBottom: 8,
                          }}
                        >
                          Personality & tone
                        </div>
                        {(() => {
                          const toneStops = [
                            { value: 0, label: "Formal" },
                            { value: 25, label: "Professional" },
                            { value: 50, label: "Neutral" },
                            { value: 75, label: "Casual" },
                            { value: 100, label: "Best friend" },
                          ];
                          const currentStop =
                            toneStops.find((t) => t.label === selectedSpecialist.personalityNotes) ||
                            toneStops[2];
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={25}
                                value={currentStop.value}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  const match = toneStops.find((t) => t.value === v) ?? toneStops[2];
                                  updateSelectedSpecialist({ personalityNotes: match.label });
                                }}
                                style={{ width: "100%" }}
                              />
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
                                {toneStops.map((t) => (
                                  <span key={t.value} style={{ textAlign: "center", width: "20%" }}>
                                    {t.label}
                                  </span>
                                ))}
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>
                                Selected tone: {currentStop.label}
                              </div>
                              <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                                This controls how friendly vs formal the assistant should sound.
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <button
                        onClick={saveSelectedSpecialist}
                        disabled={isSaving}
                        style={{
                          padding: "8px 16px",
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
                        {isSaving
                          ? "Saving specialist configuration…"
                          : "Save specialist configuration"}
                      </button>
                      <div
                        style={{ fontSize: "11px", color: "#6b7280" }}
                      >
                        These settings drive how this specialist behaves in the
                        live Zendesk integration.
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
