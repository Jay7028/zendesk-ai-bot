"use client";

import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "../../../lib/api-client";
import { withOrgPrefix } from "../../../lib/org-path";
import { supabaseBrowser } from "../../../lib/supabase-browser";

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
  publicReply?: boolean;
};

type KnowledgeChunk = {
  id: string;
  title: string;
  content: string;
  intent_id?: string | null;
  specialist_id?: string | null;
  created_at?: string;
  document_title?: string | null;
  document_url?: string | null;
  document_type?: string | null;
  document_summary?: string | null;
};

type TabKey = "info" | "data" | "knowledge" | "rules" | "escalation" | "personality";
type ZendeskFieldRule = {
  kind: "tag" | "field";
  condition: "contains" | "not_contains";
  target: string;
};

const FIELD_RULE_MARKER = "[[ZENDESK_FIELD_RULE]]";

function parseFieldRules(escalationText: string) {
  const rules: ZendeskFieldRule[] = [];
  const lines: string[] = [];
  escalationText.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(FIELD_RULE_MARKER)) {
      const payload = trimmed.slice(FIELD_RULE_MARKER.length);
      try {
        const parsed = JSON.parse(payload);
        if (
          parsed &&
          (parsed.kind === "tag" || parsed.kind === "field") &&
          (parsed.condition === "contains" || parsed.condition === "not_contains") &&
          typeof parsed.target === "string"
        ) {
          rules.push(parsed as ZendeskFieldRule);
        }
      } catch {
        // ignore
      }
    } else if (trimmed) {
      lines.push(line);
    }
  });
  return { text: lines.join("\n").trim(), rules };
}

const ZendeskFieldRuleBuilder = memo(function ZendeskFieldRuleBuilder({
  onAdd,
}: {
  onAdd: (rule: ZendeskFieldRule) => void;
}) {
  const [kind, setKind] = useState<ZendeskFieldRule["kind"]>("tag");
  const [condition, setCondition] = useState<ZendeskFieldRule["condition"]>("contains");
  const [target, setTarget] = useState("");

  const handleAdd = () => {
    if (!target.trim()) return;
    onAdd({ kind, condition, target: target.trim() });
    setTarget("");
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as ZendeskFieldRule["kind"])}
        style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
      >
        <option value="tag">Tag</option>
        <option value="field">Field</option>
      </select>
      <select
        value={condition}
        onChange={(e) => setCondition(e.target.value as ZendeskFieldRule["condition"])}
        style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db" }}
      >
        <option value="contains">contains</option>
        <option value="not_contains">does not contain</option>
      </select>
      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Tag or field name"
        style={{
          flex: 1,
          padding: "6px 8px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
        }}
      />
      <button
        type="button"
        onClick={handleAdd}
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid #22c55e",
          background: "#dcfce7",
          color: "#166534",
          fontWeight: 600,
        }}
      >
        Save rule
      </button>
    </div>
  );
});

function InlineInput({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (val: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        fontSize: 14,
      }}
    />
  );
}

function InlineTextarea({
  value,
  onCommit,
  placeholder,
  rows = 4,
}: {
  value: string;
  onCommit: (val: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);
  return (
    <textarea
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      rows={rows}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        fontSize: 14,
        fontFamily: "inherit",
      }}
    />
  );
}

const KnowledgeEditor = memo(function KnowledgeEditor({
  chunk,
  onCancel,
  onSave,
  onUploadDocument,
}: {
  chunk: KnowledgeChunk;
  onCancel: () => void;
  onSave: (payload: {
    title: string;
    content: string;
    documentTitle?: string | null;
    documentUrl?: string | null;
    documentType?: string | null;
    documentSummary?: string | null;
  }) => void;
  onUploadDocument: (file: File) => Promise<{ url: string; type: string; title: string }>;
}) {
  const [title, setTitle] = useState(chunk.title);
  const [content, setContent] = useState(chunk.content);

  useEffect(() => {
    setTitle(chunk.title);
    setContent(chunk.content);
  }, [chunk.id, chunk.title, chunk.content]);

  return (
    <div
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
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          fontSize: 14,
        }}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
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
          type="button"
          onClick={onCancel}
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
          type="button"
          onClick={() => onSave({ title: title || "", content: content || "" })}
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
  );
});

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Specialist | null>(null);
  const [tab, setTab] = useState<TabKey>("info");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [knowledge, setKnowledge] = useState<KnowledgeChunk[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [editingKbId, setEditingKbId] = useState<string | null>(null);
  const [zendeskFieldRules, setZendeskFieldRules] = useState<ZendeskFieldRule[]>([]);

  useEffect(() => {
    loadSpecialists();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const found = specialists.find((s) => s.id === selectedId) ?? null;
    setForm(found ? { ...found } : null);
    loadKnowledge(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!form?.escalationRules) {
      setZendeskFieldRules([]);
      return;
    }
    const parsed = parseFieldRules(form.escalationRules);
    setZendeskFieldRules(parsed.rules);
  }, [form?.escalationRules]);

  const selectedSpecialist = useMemo(
    () => specialists.find((s) => s.id === selectedId) ?? null,
    [selectedId, specialists]
  );

  async function loadSpecialists() {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch("/api/specialists");
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
      const res = await apiFetch(`/api/knowledge?specialistId=${encodeURIComponent(specialistId)}`);
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
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const applyZendeskFieldRules = (rules: ZendeskFieldRule[]) => {
    if (!form) return;
    const parsed = parseFieldRules(form.escalationRules || "");
    const baseText = parsed.text;
    const ruleLines = rules.map((rule) => `${FIELD_RULE_MARKER}${JSON.stringify(rule)}`);
    const combined = [baseText, ...ruleLines].filter(Boolean).join("\n").trim();
    handleFieldChange({
      escalationRules: combined,
      rulesCount: rules.length,
    });
    setZendeskFieldRules(rules);
  };

  const handleRequiredFieldsChange = (value: string) => {
    const parsed = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    handleFieldChange({ requiredFields: parsed });
  };

  const appendEscalationRule = (type: "prompt" | "zendesk") => {
    if (!form) return;
    const trimmed = form.escalationRules?.trim() || "";
    const separator = trimmed ? "\n" : "";
    const template =
      type === "prompt"
        ? "If the order is fulfilled, explain that we cannot change the delivery address and offer to follow up."
        : "If the Zendesk ticket field [Field Name] is set to [Value], add the tag and escalate to the field team.";
    handleFieldChange({ escalationRules: `${trimmed}${separator}${template}`.trim() });
  };

  const handleAddFieldRule = (rule: ZendeskFieldRule) => {
    applyZendeskFieldRules([...zendeskFieldRules, rule]);
  };

  const removeFieldRule = (index: number) => {
    const filtered = zendeskFieldRules.filter((_, idx) => idx !== index);
    applyZendeskFieldRules(filtered);
  };

  const handleSave = async () => {
    if (!form) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await apiFetch("/api/specialists", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save specialist");
      const saved: Specialist = await res.json();
      setSpecialists((prev) => {
        const existing = prev.find((s) => s.id === saved.id);
        if (existing) return prev.map((s) => (s.id === saved.id ? saved : s));
        return [saved, ...prev];
      });
      setSelectedId(saved.id);
      setForm(saved);
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
      const res = await apiFetch("/api/specialists", {
        method: "POST",
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
      setForm(created);
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
      const res = await apiFetch(`/api/specialists?id=${encodeURIComponent(selectedSpecialist.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete specialist");
      setSpecialists((prev) => prev.filter((s) => s.id !== selectedSpecialist.id));
      const remaining = specialists.filter((s) => s.id !== selectedSpecialist.id);
      setSelectedId(remaining[0]?.id ?? null);
      setKnowledge([]);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKnowledge = async (payload: { title: string; content: string }) => {
    if (!selectedId) return;
    if (!payload.title.trim() || !payload.content.trim()) {
      setKnowledgeError("Title and content are required");
      return;
    }
    try {
      setKnowledgeLoading(true);
      setKnowledgeError(null);
      const res = await apiFetch("/api/knowledge/add", {
        method: "POST",
        body: JSON.stringify({
          title: payload.title,
          content: payload.content,
          specialistId: selectedId,
        }),
      });
      if (!res.ok) throw new Error("Failed to add knowledge");
      const json = await res.json();
      setKnowledge((prev) => [json.chunk, ...prev]);
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
      const res = await apiFetch(`/api/knowledge?id=${encodeURIComponent(chunk.id)}`, {
        method: "PATCH",
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
      const res = await apiFetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
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

  const handleUploadDocument = async (file: File) => {
    const ext = file.name.split(".").pop() || "pdf";
    const path = `documents/${selectedId || "general"}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const { data, error } = await supabaseBrowser.storage.from("documents").upload(path, file, {
      upsert: true,
    });
    if (error) throw new Error(error.message);
    const { data: publicUrl } = supabaseBrowser.storage.from("documents").getPublicUrl(data.path);
    return { url: publicUrl.publicUrl, type: file.type || "application/pdf", title: file.name };
  };

  const FieldLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{label}</div>
  );

  const NewKnowledgeEditor = memo(function NewKnowledgeEditor({
    onCommit,
    onUploadDocument,
    disabled,
  }: {
    onCommit: (payload: {
      title: string;
      content: string;
      documentTitle?: string | null;
      documentUrl?: string | null;
      documentType?: string | null;
      documentSummary?: string | null;
    }) => void;
    onUploadDocument: (file: File) => Promise<{ url: string; type: string; title: string }>;
    disabled: boolean;
  }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [documentTitle, setDocumentTitle] = useState("");
    const [documentUrl, setDocumentUrl] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [documentSummary, setDocumentSummary] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleUpload = async (file?: File | null) => {
      if (!file) return;
      try {
        setUploading(true);
        setUploadError(null);
        const uploaded = await onUploadDocument(file);
        setDocumentUrl(uploaded.url);
        setDocumentType(uploaded.type);
        if (!documentTitle) setDocumentTitle(uploaded.title);
      } catch (e: any) {
        setUploadError(e.message ?? "Upload failed");
      } finally {
        setUploading(false);
      }
    };

    const handleAdd = () => {
      if (!title.trim() || !content.trim()) return;
      onCommit({
        title: title.trim(),
        content: content.trim(),
        documentTitle: documentTitle.trim() || null,
        documentUrl: documentUrl.trim() || null,
        documentType: documentType.trim() || null,
        documentSummary: documentSummary.trim() || null,
      });
      setTitle("");
      setContent("");
      setDocumentTitle("");
      setDocumentUrl("");
      setDocumentType("");
      setDocumentSummary("");
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        <FieldLabel label="Title" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Key policy details, escalation steps, SLAs..."
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <div style={{ fontWeight: 600 }}>Document (optional)</div>
          <input
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder="Document title"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              fontSize: 14,
            }}
          />
          <input
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
            placeholder="Document URL (or upload below)"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              fontSize: 14,
            }}
          />
          <input
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            placeholder="Type (e.g., pdf)"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              fontSize: 14,
            }}
          />
          <textarea
            value={documentSummary}
            onChange={(e) => setDocumentSummary(e.target.value)}
            rows={2}
            placeholder="Short summary of the document"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #c7d2fe",
                background: "#eef2ff",
                color: "#1d4ed8",
                fontWeight: 700,
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={(e) => handleUpload(e.target.files?.[0])}
                disabled={uploading}
              />
            </label>
            {documentUrl && (
              <a href={documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                View document
              </a>
            )}
            {uploadError && <span style={{ color: "#b91c1c", fontSize: 12 }}>{uploadError}</span>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #c7d2fe",
              background: "#eef2ff",
              color: "#1d4ed8",
              fontWeight: 700,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.7 : 1,
            }}
          >
            Add snippet
          </button>
        </div>
      </div>
    );
  });

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
    { id: "orgs", label: "Org & Members", href: "/admin/orgs" },
    { id: "org-settings", label: "Org Settings", href: "/admin/orgs/settings" },
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
          <a key={item.id} href={withOrgPrefix(item.href)} style={{ textDecoration: "none" }}>
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
            gap: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>AI Specialists</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Choose a specialist</div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {isLoading && <div style={{ color: "#6b7280" }}>Loading specialists.</div>}
            {!isLoading &&
              specialists.map((spec) => {
                const active = spec.id === selectedId;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => setSelectedId(spec.id)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 999,
                      border: "1px solid transparent",
                      background: spec.active ? "#dcfce7" : "#fee2e2",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      boxShadow:
                        spec.id === selectedId
                          ? "0 1px 6px rgba(59,130,246,0.25)"
                          : "0 1px 3px rgba(15,23,42,0.06)",
                      color: spec.active ? "#065f46" : "#991b1b",
                      fontWeight: spec.id === selectedId ? 700 : 500,
                    }}
                  >
                    <span>{spec.name || "Untitled Specialist"}</span>
                  </button>
                );
              })}
          </div>
        </div>

        <div
          style={{
            width: 260,
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            background: "#fff",
            boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
            padding: 12,
            display: "none",
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
          {!form && !isLoading ? (
            <div style={{ color: "#6b7280" }}>Select or create a specialist to begin.</div>
          ) : null}

          {form && (
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
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{form?.name || "Untitled"}</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {form?.description || "Add a short description so teammates know when to use this."}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={form?.active || false}
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
                <TabButton keyName="info" label="Info" />
                <TabButton keyName="data" label="Data Extraction" />
                <TabButton keyName="knowledge" label="Knowledge Base" />
                <TabButton keyName="rules" label="Automation Rules" />
                <TabButton keyName="escalation" label="Escalation Rules" />
                <TabButton keyName="personality" label="Personality" />
              </div>

          {tab === "info" && (
            <Card title="Basics">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <FieldLabel label="Name" />
                  <InlineInput
                    value={form.name}
                    onCommit={(val) => handleFieldChange({ name: val })}
                    placeholder="Specialist name"
                  />
                </div>
                <div>
                  <FieldLabel label="Description" />
                  <InlineTextarea
                    value={form.description}
                    onCommit={(val) => handleFieldChange({ description: val })}
                    placeholder="What this specialist does"
                    rows={4}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={form.publicReply ?? true}
                    onChange={(e) => handleFieldChange({ publicReply: e.target.checked })}
                  />
                  Post replies as public comments (uncheck to send as internal note only)
                </label>
              </div>
            </Card>
          )}

              {tab === "data" && (
                <Card title="Extracted Entities">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <FieldLabel label="Data extraction prompt" />
                      <InlineTextarea
                        value={form.dataExtractionPrompt || ""}
                        onCommit={(val) => handleFieldChange({ dataExtractionPrompt: val })}
                        rows={4}
                        placeholder="Tell the AI what fields to pull out of a message."
                      />
                    </div>
                    <div>
                      <FieldLabel label="Required fields (comma separated)" />
                      <InlineInput
                        value={form.requiredFields?.join(", ") || ""}
                        onCommit={(val) => handleRequiredFieldsChange(val)}
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
                      <NewKnowledgeEditor
                        onCommit={handleAddKnowledge}
                        onUploadDocument={handleUploadDocument}
                        disabled={knowledgeLoading}
                      />
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

                      return isEditing ? (
                        <KnowledgeEditor
                          key={chunk.id}
                          chunk={chunk}
                          onCancel={() => setEditingKbId(null)}
                          onSave={(payload) => handleUpdateKnowledge(chunk, payload)}
                          onUploadDocument={handleUploadDocument}
                        />
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
                                type="button"
                                onClick={() => {
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
                                type="button"
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
                          {(chunk.document_title || chunk.document_url || chunk.document_type || chunk.document_summary) && (
                            <div
                              style={{
                                marginTop: 8,
                                padding: 10,
                                borderRadius: 10,
                                background: "#f8fafc",
                                border: "1px solid #e5e7eb",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <div style={{ fontWeight: 600, fontSize: 13 }}>Document</div>
                              {chunk.document_title && <div style={{ fontSize: 13 }}>{chunk.document_title}</div>}
                              {chunk.document_type && <div style={{ fontSize: 12, color: "#6b7280" }}>{chunk.document_type}</div>}
                              {chunk.document_summary && <div style={{ fontSize: 12, color: "#374151" }}>{chunk.document_summary}</div>}
                              {chunk.document_url && (
                                <a href={chunk.document_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#2563eb" }}>
                                  View document
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {tab === "rules" && (
                <Card title="Automation rules">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 13, color: "#374151" }}>
                      Describe the step-by-step logic in plain English (e.g., order status checks before allowing address changes).
                      Keep it concise so we can map it to integrations later.
                    </div>
                    <InlineTextarea
                      value={form.knowledgeBaseNotes || ""}
                      onCommit={(val) => handleFieldChange({ knowledgeBaseNotes: val })}
                      rows={10}
                      placeholder={`Example:\n- If order is fulfilled: tell the customer we cannot change the address.\n- If order is NOT fulfilled: ask for order ID and new address fields, then update it.\n- Always confirm the change and share the expected processing time.`}
                    />
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Tip: Use bullets or short sentences. We’ll add structured evaluation and Shopify lookups next.
                    </div>
                  </div>
                </Card>
              )}

              {tab === "escalation" && (
                <Card title="Escalation rules">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, color: "#374151" }}>
                      Use the builder below to describe when to escalate. Pick one of the preset rule types and we will help
                      generate the prompt you can paste directly below.
                    </div>
                    <div
                      style={{
                        border: "1px dashed #d1d5db",
                        borderRadius: 10,
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Zendesk field rule builder</div>
                    <ZendeskFieldRuleBuilder onAdd={handleAddFieldRule} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {zendeskFieldRules.length === 0 && (
                          <div style={{ fontSize: 12, color: "#6b7280" }}>No field rules yet.</div>
                        )}
                        {zendeskFieldRules.map((rule, idx) => (
                          <div
                            key={`${rule.kind}-${idx}`}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "6px 8px",
                              borderRadius: 8,
                              background: "#fff",
                              border: "1px solid #e5e7eb",
                              fontSize: 12,
                            }}
                          >
                          <span>
                            [{rule.kind}] {rule.target} {rule.condition.replace("_", " ")}
                          </span>
                            <button
                              type="button"
                              onClick={() => removeFieldRule(idx)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#e11d48",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <FieldLabel label="Rules" />
                    <InlineTextarea
                      value={form.escalationRules || ""}
                      onCommit={(val) => handleFieldChange({ escalationRules: val })}
                      rows={6}
                      placeholder="Describe when to hand off to a human."
                    />
                  </div>
                </Card>
              )}

              {tab === "personality" && (
                <Card title="Personality">
                  <FieldLabel label="Voice and tone" />
                  <InlineTextarea
                    value={form.personalityNotes || ""}
                    onCommit={(val) => handleFieldChange({ personalityNotes: val })}
                    rows={6}
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
