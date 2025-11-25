"use client";

import { useState, useEffect } from "react";
import type { TabKey, SpecialistConfig } from "../../api/specialists/data";

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<SpecialistConfig[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>();
  const [activeTab, setActiveTab] = useState<TabKey>("data");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kbTitle, setKbTitle] = useState("");
  const [kbContent, setKbContent] = useState("");
  const [kbStatus, setKbStatus] = useState<string | null>(null);
  const [kbList, setKbList] = useState<
    { id: string; title: string; content: string; specialist_id?: string | null }[]
  >([]);

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

useEffect(() => {
  async function loadKnowledge(specId: string | undefined) {
    if (!specId) {
      setKbList([]);
      return;
    }
    try {
      const res = await fetch(`/api/knowledge?specialistId=${encodeURIComponent(specId)}`);
      if (!res.ok) throw new Error("Failed to load knowledge");
      const data = await res.json();
      setKbList(data || []);
      setKbStatus(null);
    } catch (e) {
      console.error(e);
      setKbStatus("Failed to load knowledge");
    }
  }
  loadKnowledge(selectedSpecialistId);
}, [selectedSpecialistId]);

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

  async function deleteSpecialist() {
    if (!selectedSpecialist) return;
    const ok = typeof window !== "undefined" ? window.confirm("Delete this specialist?") : true;
    if (!ok) return;
    try {
      setIsDeleting(true);
      setError(null);
      const res = await fetch(`/api/specialists?id=${encodeURIComponent(selectedSpecialist.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete specialist");
      setSpecialists((prev) => prev.filter((s) => s.id !== selectedSpecialist.id));
      const remaining = specialists.filter((s) => s.id !== selectedSpecialist.id);
      setSelectedSpecialistId(remaining[0]?.id);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function addKnowledgeChunk() {
    if (!selectedSpecialist) {
      setKbStatus("Select a specialist first.");
      return;
    }
    if (!kbTitle.trim() || !kbContent.trim()) {
      setKbStatus("Title and content are required.");
      return;
    }
    setKbStatus("Saving...");
    try {
      const res = await fetch("/api/knowledge/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: kbTitle,
          content: kbContent,
          specialistId: selectedSpecialist.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKbStatus(data.error || "Failed to save knowledge");
        return;
      }
      setKbStatus("Added to knowledge.");
      setKbTitle("");
      setKbContent("");
      setKbList((prev) => [
        {
          id: data?.chunk?.id || `temp-${Date.now()}`,
          title: kbTitle,
          content: kbContent,
          specialist_id: selectedSpecialist.id,
        },
        ...prev,
      ]);
    } catch (e: any) {
      setKbStatus(e?.message || "Failed to save knowledge");
    }
  }

  async function saveKnowledgeChunk(id: string, title: string, content: string) {
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          specialistId: selectedSpecialistId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setKbList((prev) => prev.map((k) => (k.id === id ? { ...k, title, content } : k)));
      setKbStatus("Knowledge updated.");
    } catch (e: any) {
      setKbStatus(e?.message || "Update failed");
    }
  }

  async function deleteKnowledgeChunk(id: string) {
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setKbList((prev) => prev.filter((k) => k.id !== id));
      setKbStatus("Knowledge deleted.");
    } catch (e: any) {
      setKbStatus(e?.message || "Delete failed");
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
          "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
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
            { id: "home", label: "Home", href: "/" },
            { id: "specialists", label: "AI Specialists", href: "/admin/specialists", active: true },
            { id: "intents", label: "Intents", href: "/admin/intents" },
            { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
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
                      Knowledge notes (general guidance)
                    </label>
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
                      value={
                        (selectedSpecialist as any).escalation_rules ??
                        selectedSpecialist.escalationRules ??
                        ""
                      }
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
                    <button
                      onClick={deleteSpecialist}
                      disabled={isDeleting || !selectedSpecialist}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        border: "1px solid #ef4444",
                        background: "#fff",
                        color: "#b91c1c",
                        fontWeight: 600,
                        cursor: isDeleting ? "default" : "pointer",
                      }}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                      {error && (
                      <div style={{ fontSize: 12, color: "#f97316" }}>
                        {error}
                      </div>
                    )}
                  </div>
                  {kbStatus && (
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{kbStatus}</div>
                  )}
                  {kbList.length > 0 && (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: "1px solid #e5e7eb",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Existing knowledge</div>
                      {kbList.map((k) => (
                        <div
                          key={k.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "10px",
                            background: "#f9fafb",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <input
                            value={k.title}
                            onChange={(e) =>
                              setKbList((prev) =>
                                prev.map((row) =>
                                  row.id === k.id ? { ...row, title: e.target.value } : row
                                )
                              )
                            }
                            style={{
                              width: "100%",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              padding: "8px",
                              fontSize: 13,
                            }}
                          />
                          <textarea
                            value={k.content}
                            onChange={(e) =>
                              setKbList((prev) =>
                                prev.map((row) =>
                                  row.id === k.id ? { ...row, content: e.target.value } : row
                                )
                              )
                            }
                            rows={3}
                            style={{
                              width: "100%",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              padding: "8px",
                              fontSize: 13,
                            }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => saveKnowledgeChunk(k.id, k.title, k.content)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid #4f46e5",
                                background: "#eef2ff",
                                color: "#1f2937",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => deleteKnowledgeChunk(k.id)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid #ef4444",
                                background: "#fff",
                                color: "#b91c1c",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid #e5e7eb",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Add knowledge snippet</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Create a small policy chunk for this specialist. It will be retrieved automatically.
                      </div>
                      <input
                        value={kbTitle}
                        onChange={(e) => setKbTitle(e.target.value)}
                        placeholder="Title"
                        style={{
                          width: "100%",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          padding: "8px",
                          fontSize: 13,
                        }}
                      />
                      <textarea
                        value={kbContent}
                        onChange={(e) => setKbContent(e.target.value)}
                        rows={4}
                        placeholder="Content (short, self-contained policy/scenario)"
                        style={{
                          width: "100%",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          padding: "8px",
                          fontSize: 13,
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={addKnowledgeChunk}
                          style={{
                            padding: "8px 14px",
                            borderRadius: "8px",
                            border: "1px solid #4f46e5",
                            background: "#eef2ff",
                            color: "#1f2937",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Add knowledge
                        </button>
                        {kbStatus && <div style={{ fontSize: 12, color: "#6b7280" }}>{kbStatus}</div>}
                      </div>
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
