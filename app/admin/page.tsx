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
      {/* Top bar */}
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
          <div style={{ fontSize: "20px", fontWeight: 600 }}>AI Specialists</div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            Manage knowledge, rules and personality for each specialist.
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "#9ca3af" }}>
          Environment: <span style={{ color: "#22c55e" }}>Development</span>
        </div>
      </header>
            {/* TEMP: debug button to create a dummy log entry */}
      <div style={{ padding: "8px 24px", borderBottom: "1px solid #111827" }}>
        <button
          onClick={async () => {
            await fetch("/api/logs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                zendeskTicketId: "test-ticket-123",
                specialistId: "test-specialist",
                specialistName: "Test Specialist",
                inputSummary: "This is a dummy test log created from admin UI.",
                knowledgeSources: ["dummy_source"],
                outputSummary: "Dummy output.",
                status: "success",
              }),
            });
            alert("Dummy log created (if API is working).");
          }}
          style={{
            padding: "6px 12px",
            borderRadius: "999px",
            border: "1px solid #374151",
            background: "#020617",
            color: "#e5e7eb",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Create dummy log (debug)
        </button>
      </div>


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
            { id: "inbox", label: "Inbox" },
            { id: "triage", label: "Triage & Routing" },
            { id: "specialists", label: "AI Specialists", active: true },
            { id: "settings", label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                background: item.active ? "#111827" : "transparent",
                color: item.active ? "#e5e7eb" : "#9ca3af",
              }}
            >
              {item.label}
            </button>
          ))}
        </aside>

        {/* Specialists sidebar + main content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Secondary sidebar: Your Specialists */}
          <aside
            style={{
              width: "260px",
              borderRight: "1px solid #111827",
              padding: "16px",
              overflowY: "auto",
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
            <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: 12 }}>
              Manage the bots that handle different scenarios.
            </div>

            {isLoading && (
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
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
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: isSelected
                        ? "1px solid #22c55e"
                        : "1px solid #1f2937",
                      background: isSelected ? "#0b1220" : "#020617",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#e5e7eb",
                      }}
                    >
                      {spec.name}
                    </span>
                    <span
                      style={{ fontSize: "11px", color: "#9ca3af" }}
                    >{`${spec.docsCount} docs • ${spec.rulesCount} rules`}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: spec.active ? "#22c55e" : "#f97316",
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
            }}
          >
            {!selectedSpecialist && (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                No specialists available yet.
              </div>
            )}

            {selectedSpecialist && (
              <>
                            {/* Specialist header */}
            <section
              style={{
                borderRadius: "12px",
                border: "1px solid #1f2937",
                padding: "16px",
                background:
                  "radial-gradient(circle at top left, #22c55e11, #020617)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div>
                <input
                  value={selectedSpecialist.name}
                  onChange={(e) =>
                    updateSelectedSpecialist({ name: e.target.value })
                  }
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    marginBottom: 4,
                    background: "transparent",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    color: "#e5e7eb",
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
                    color: "#e5e7eb",
                    marginBottom: 4,
                    background: "#020617",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    resize: "vertical",
                  }}
                />
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {selectedSpecialist.docsCount} training docs •{" "}
                  {selectedSpecialist.rulesCount} rules
                </div>
              </div>
              <button
                onClick={() => toggleSpecialistActive(selectedSpecialist.id)}
                style={{
                  fontSize: "12px",
                  padding: "6px 14px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  background: selectedSpecialist.active
                    ? "#22c55e"
                    : "#4b5563",
                  color: "#020617",
                  fontWeight: 600,
                }}
              >
                {selectedSpecialist.active ? "Active" : "Inactive"}
              </button>
            </section>


                {/* Tabs */}
                <section
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #1f2937",
                    background: "#020617",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      borderBottom: "1px solid #1f2937",
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
                            padding: "10px 4px",
                            marginRight: 12,
                            border: "none",
                            borderBottom: isActive
                              ? "2px solid #22c55e"
                              : "2px solid transparent",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: "13px",
                            color: isActive ? "#e5e7eb" : "#9ca3af",
                            fontWeight: isActive ? 500 : 400,
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
                              border: "1px solid #374151",
                              background: "#020617",
                              color: "#e5e7eb",
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
                              border: "1px solid #374151",
                              background: "#020617",
                              color: "#e5e7eb",
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
                            border: "1px solid #374151",
                            background: "#020617",
                            color: "#e5e7eb",
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
                            border: "1px solid #374151",
                            background: "#020617",
                            color: "#e5e7eb",
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
                        <textarea
                          value={selectedSpecialist.personalityNotes}
                          onChange={(e) =>
                            updateSelectedSpecialist({
                              personalityNotes: e.target.value,
                            })
                          }
                          rows={8}
                          style={{
                            width: "100%",
                            resize: "vertical",
                            borderRadius: "8px",
                            border: "1px solid #374151",
                            background: "#020617",
                            color: "#e5e7eb",
                            padding: "8px",
                            fontSize: "12px",
                            marginBottom: 8,
                          }}
                        />
                        <div
                          style={{ fontSize: "11px", color: "#9ca3af" }}
                        >
                          Later this will feed into the system prompt for this
                          specialist.
                        </div>
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
                          background: "#22c55e",
                          color: "#020617",
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
                        style={{ fontSize: "11px", color: "#9ca3af" }}
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
