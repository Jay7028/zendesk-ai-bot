"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type Specialist = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  docsCount: number;
  rulesCount: number;
  dataExtractionPrompt: string;
  requiredFields: string[];
  knowledgeBaseNotes?: string;
  escalationRules: string;
  personalityNotes: string;
};

type KnowledgeChunk = {
  id: string;
  title: string;
  content: string;
  intent_id?: string | null;
  specialist_id?: string | null;
  created_at?: string;
};

type TabKey = "data" | "knowledge" | "escalation" | "personality";

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Specialist | null>(null);
  const [tab, setTab] = useState<TabKey>("data");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [knowledge, setKnowledge] = useState<KnowledgeChunk[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbContent, setNewKbContent] = useState("");
  const [editingKbId, setEditingKbId] = useState<string | null>(null);
  const [kbEdits, setKbEdits] = useState<Record<string, { title: string; content: string }>>({});

  useEffect(() => {
    loadSpecialists();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const found = specialists.find((s) => s.id === selectedId) ?? null;
    setDraft(found ? { ...found } : null);
    loadKnowledge(selectedId);
  }, [selectedId, specialists]);

  const selectedSpecialist = useMemo(
    () => specialists.find((s) => s.id === selectedId) ?? null,
    [selectedId, specialists]
  );

  async function loadSpecialists() {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/specialists");
      if (!res.ok) throw new Error("Failed to load specialists");
      const data: Specialist[] = await res.json();
      setSpecialists(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadKnowledge(specialistId: string) {
    try {
      setKnowledgeLoading(true);
      setKnowledgeError(null);
      const res = await fetch(`/api/knowledge?specialistId=${encodeURIComponent(specialistId)}`);
      if (!res.ok) throw new Error("Failed to load knowledge");
      const data: KnowledgeChunk[] = await res.json();
      setKnowledge(data);
    } catch (e: any) {
      setKnowledgeError(e.message ?? "Unexpected error");
    } finally {
      setKnowledgeLoading(false);
    }
  }

  const handleFieldChange = (patch: Partial<Specialist>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleRequiredFieldsChange = (value: string) => {
    const parsed = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    handleFieldChange({ requiredFields: parsed });
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to save specialist");
      const saved: Specialist = await res.json();
      setSpecialists((prev) => {
        const existing = prev.find((s) => s.id === saved.id);
        if (existing) return prev.map((s) => (s.id === saved.id ? saved : s));
        return [saved, ...prev];
      });
      setSelectedId(saved.id);
      setDraft(saved);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/specialists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Specialist",
          description: "",
          active: true,
          docsCount: 0,
          rulesCount: 0,
          dataExtractionPrompt: "",
          requiredFields: [],
          knowledgeBaseNotes: "",
          escalationRules: "",
          personalityNotes: "",
        }),
      });
      if (!res.ok) throw new Error("Failed to create specialist");
      const created: Specialist = await res.json();
      setSpecialists((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setDraft(created);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSpecialist) return;
    const confirmed = window.confirm(`Delete ${selectedSpecialist.name}?`);
    if (!confirmed) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/specialists?id=${encodeURIComponent(selectedSpecialist.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete specialist");
      setSpecialists((prev) => prev.filter((s) => s.id !== selectedSpecialist.id));
      setDraft(null);
      const remaining = specialists.filter((s) => s.id !== selectedSpecialist.id);
      setSelectedId(remaining[0]?.id ?? null);
      setKnowledge([]);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKnowledge = async () => {
    if (!selectedId) return;
    if (!newKbTitle.trim() || !newKbContent.trim()) {
      setKnowledgeError("Title and content are required");
      return;
    }
    try {
      setKnowledgeLoading(true);
      setKnowledgeError(null);
      const res = await fetch("/api/knowledge/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newKbTitle,
          content: newKbContent,
          specialistId: selectedId,
        }),
      });
      if (!res.ok) throw new Error("Failed to add knowledge");
      const json = await res.json();
      setKnowledge((prev) => [json.chunk, ...prev]);
      setNewKbTitle("");
      setNewKbContent("");
    } catch (e: any) {
      setKnowledgeError(e.message ?? "Unexpected error");
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const handleUpdateKnowledge = async (
    chunk: KnowledgeChunk,
    updates: { title: string; content: string }
  ) => {
    try {
      setKnowledgeLoading(true);
      setKnowledgeError(null);
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(chunk.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updates.title,
          content: updates.content,
          specialistId: selectedId,
        }),
      });
      if (!res.ok) throw new Error("Failed to update knowledge");
      const json = await res.json();
      setKnowledge((prev) => prev.map((k) => (k.id === chunk.id ? json.chunk : k)));
      setEditingKbId(null);
    } catch (e: any) {
      setKnowledgeError(e.message ?? "Unexpected error");
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    const confirmed = window.confirm("Delete this knowledge snippet?");
    if (!confirmed) return;
    try {
      setKnowledgeLoading(true);
      setKnowledgeError(null);
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete knowledge");
      setKnowledge((prev) => prev.filter((k) => k.id !== id));
    } catch (e: any) {
      setKnowledgeError(e.message ?? "Unexpected error");
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const FieldLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{label}</div>
  );

  const TabButton = ({ keyName, label }: { keyName: TabKey; label: string }) => {
    const active = tab === keyName;
    return (
      <button
        onClick={() => setTab(keyName)}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: active ? "1px solid #c7d2fe" : "1px solid #e5e7eb",
          background: active ? "#eef2ff" : "#f9fafb",
          color: active ? "#111827" : "#6b7280",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  const Card = ({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) => (
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

  const leftNavItems = [
    { id: "home", label: "Home", href: "/", active: false },
    { id: "specialists", label: "AI Specialists", href: "/admin/specialists", active: true },
    { id: "intents", label: "Intents", href: "/admin/intents" },
    { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
    { id: "integrations", label: "Integrations", href: "/admin/integrations" },
    { id: "logs", label: "Logs", href: "/admin/logs" },
    { id: "test-ai", label: "Test AI", href: "/admin/test-ai" },
    { id: "track", label: "Track", href: "/admin/track" },
  ];

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
        {leftNavItems.map((item) => (
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

      <div style={{ flex: 1, padding: "24px", display: "flex", gap: 16 }}>
        <div
          style={{
            width: 260,
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            background: "#fff",
            boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>AI Specialists</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Manage knowledge and rules
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={isSaving}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #c7d2fe",
                background: "#eef2ff",
                color: "#1d4ed8",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + New
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {isLoading && <div style={{ color: "#6b7280" }}>Loading specialists…</div>}
            {!isLoading && !specialists.length && (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No specialists yet.</div>
            )}
            {specialists.map((spec) => {
              const active = spec.id === selectedId;
              return (
                <div
                  key={spec.id}
                  onClick={() => setSelectedId(spec.id)}
                  style={{
                    border: active ? "1px solid #c7d2fe" : "1px solid #e5e7eb",
                    background: active ? "#eef2ff" : "#f9fafb",
                    borderRadius: 12,
                    padding: 12,
                    cursor: "pointer",
                    boxShadow: active ? "0 1px 6px rgba(59,130,246,0.25)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: spec.active ? "#22c55e" : "#d1d5db",
                      }}
                    />
                    <div style={{ fontWeight: 700 }}>{spec.name || "Untitled"}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {spec.description || "No description yet."}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    {spec.docsCount} docs • {spec.rulesCount} rules
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {error && (
            <div style={{ color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 10 }}>
              {error}
            </div>
          )}
          {!selectedSpecialist && !isLoading ? (
            <div style={{ color: "#6b7280" }}>Select or create a specialist to begin.</div>
          ) : null}

          {draft && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
                }}
              >
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{draft.name || "Untitled"}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {draft.description || "Add a short description so teammates know when to use this."}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => handleFieldChange({ active: e.target.checked })}
                    />
                    Active
                  </label>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #22c55e",
                      background: "#dcfce7",
                      color: "#166534",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #fca5a5",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <TabButton keyName="data" label="Data Extraction" />
                <TabButton keyName="knowledge" label="Knowledge Base" />
                <TabButton keyName="escalation" label="Escalation Rules" />
                <TabButton keyName="personality" label="Personality" />
              </div>

              {tab === "data" && (
                <Card title="Extracted Entities">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <FieldLabel label="Description" />
                      <input
                        value={draft.description || ""}
                        onChange={(e) => handleFieldChange({ description: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          fontSize: 14,
                        }}
                        placeholder="e.g. Handles billing disputes and refund requests"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Data extraction prompt" />
                      <textarea
                        value={draft.dataExtractionPrompt || ""}
                        onChange={(e) => handleFieldChange({ dataExtractionPrompt: e.target.value })}
                        rows={4}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          fontSize: 14,
                          fontFamily: "inherit",
                        }}
                        placeholder="Tell the AI what fields to pull out of a message."
                      />
                    </div>
                    <div>
                      <FieldLabel label="Required fields (comma separated)" />
                      <input
                        value={draft.requiredFields?.join(", ") || ""}
                        onChange={(e) => handleRequiredFieldsChange(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          fontSize: 14,
                        }}
                        placeholder="tracking_number, postcode"
                      />
                    </div>
                  </div>
                </Card>
              )}

              {tab === "knowledge" && (
                <Card
                  title="Knowledge snippets"
                  actions={
                    knowledgeLoading ? (
                      <span style={{ color: "#6b7280", fontSize: 12 }}>Saving…</span>
                    ) : knowledgeError ? (
                      <span style={{ color: "#b91c1c", fontSize: 12 }}>{knowledgeError}</span>
                    ) : null
                  }
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div
                      style={{
                        border: "1px dashed #c7d2fe",
                        padding: 12,
                        borderRadius: 12,
                        background: "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <FieldLabel label="Title" />
                      <input
                        value={newKbTitle}
                        onChange={(e) => setNewKbTitle(e.target.value)}
                        placeholder="e.g. Disputed delivery with signature"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          fontSize: 14,
                        }}
                      />
                      <FieldLabel label="Content" />
                      <textarea
                        value={newKbContent}
                        onChange={(e) => setNewKbContent(e.target.value)}
                        rows={3}
                        placeholder="Guidance or policy snippet"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          fontSize: 14,
                          fontFamily: "inherit",
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={handleAddKnowledge}
                          disabled={knowledgeLoading}
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
                          Add snippet
                        </button>
                      </div>
                    </div>

                    {knowledgeLoading && knowledge.length === 0 && (
                      <div style={{ color: "#6b7280" }}>Loading…</div>
                    )}
                    {!knowledgeLoading && knowledge.length === 0 && (
                      <div style={{ color: "#6b7280", fontSize: 13 }}>
                        No knowledge snippets yet. Add policy fragments for retrieval.
                      </div>
                    )}

                    {knowledge.map((chunk) => {
                      const isEditing = editingKbId === chunk.id;
                      const edit = kbEdits[chunk.id] || { title: chunk.title, content: chunk.content };

                      return isEditing ? (
                        <div
                          key={chunk.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 12,
                            background: "#f9fafb",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          <input
                            value={edit.title}
                            onChange={(e) =>
                              setKbEdits((prev) => ({ ...prev, [chunk.id]: { ...edit, title: e.target.value } }))
                            }
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: "1px solid #e5e7eb",
                              fontSize: 14,
                            }}
                          />
                          <textarea
                            value={edit.content}
                            onChange={(e) =>
                              setKbEdits((prev) => ({ ...prev, [chunk.id]: { ...edit, content: e.target.value } }))
                            }
                            rows={3}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: "1px solid #e5e7eb",
                              fontSize: 14,
                              fontFamily: "inherit",
                            }}
                          />
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setEditingKbId(null)}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #e5e7eb",
                                background: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateKnowledge(chunk, { title: edit.title, content: edit.content })
                              }
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #22c55e",
                                background: "#dcfce7",
                                color: "#166534",
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={chunk.id}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 12,
                            padding: 12,
                            background: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 700 }}>{chunk.title}</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => {
                                  setKbEdits((prev) => ({ ...prev, [chunk.id]: edit }));
                                  setEditingKbId(chunk.id);
                                }}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  border: "1px solid #e5e7eb",
                                  background: "#f9fafb",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteKnowledge(chunk.id)}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  border: "1px solid #fca5a5",
                                  background: "#fef2f2",
                                  color: "#b91c1c",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>
                            {chunk.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {tab === "escalation" && (
                <Card title="Escalation rules">
                  <FieldLabel label="Rules" />
                  <textarea
                    value={draft.escalationRules || ""}
                    onChange={(e) => handleFieldChange({ escalationRules: e.target.value })}
                    rows={6}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                    placeholder="Describe when to hand off to a human."
                  />
                </Card>
              )}

              {tab === "personality" && (
                <Card title="Personality">
                  <FieldLabel label="Voice and tone" />
                  <textarea
                    value={draft.personalityNotes || ""}
                    onChange={(e) => handleFieldChange({ personalityNotes: e.target.value })}
                    rows={6}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                    placeholder="How should this specialist speak?"
                  />
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
