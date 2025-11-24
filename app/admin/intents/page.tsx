"use client";

import { useEffect, useState } from "react";
import type { IntentConfig } from "../../api/intents/types";
import type { SpecialistConfig } from "../../api/specialists/data";

export default function IntentsPage() {
  const [intents, setIntents] = useState<IntentConfig[]>([]);
  const [specialists, setSpecialists] = useState<SpecialistConfig[]>([]);
  const [selectedIntentId, setSelectedIntentId] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [intentRes, specRes] = await Promise.all([
          fetch("/api/intents"),
          fetch("/api/specialists"),
        ]);
        if (!intentRes.ok) throw new Error("Failed to load intents");
        if (!specRes.ok) throw new Error("Failed to load specialists");
        const intentData: IntentConfig[] = await intentRes.json();
        const specData: SpecialistConfig[] = await specRes.json();
        setIntents(intentData);
        setSpecialists(specData);
        if (intentData[0]) setSelectedIntentId(intentData[0].id);
      } catch (e: any) {
        setError(e.message ?? "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedIntent = intents.find((i) => i.id === selectedIntentId) ?? null;

  function updateSelectedIntent(partial: Partial<IntentConfig>) {
    if (!selectedIntent) return;
    setIntents((prev) =>
      prev.map((i) => (i.id === selectedIntent.id ? { ...i, ...partial } : i))
    );
  }

  async function handleCreateIntent() {
    const draft: Partial<IntentConfig> = {
      name: "New Intent",
      description: "Describe when this intent should match.",
      specialistId: specialists[0]?.id ?? "",
    };
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to create intent");
      const created: IntentConfig = await res.json();
      setIntents((prev) => [...prev, created]);
      setSelectedIntentId(created.id);
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while creating intent");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSelectedIntent() {
    if (!selectedIntent) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/intents/${selectedIntent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedIntent),
      });
      if (!res.ok) throw new Error("Failed to save intent");
      const updated: IntentConfig = await res.json();
      setIntents((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while saving intent");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSelectedIntent() {
    if (!selectedIntent) return;
    const confirmed = window.confirm(
      `Delete intent "${selectedIntent.name}"?`
    );
    if (!confirmed) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/intents/${selectedIntent.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete intent");
      setIntents((prev) => {
        const remaining = prev.filter((i) => i.id !== selectedIntent.id);
        setSelectedIntentId(remaining[0]?.id);
        return remaining;
      });
    } catch (e: any) {
      setError(e.message ?? "Unexpected error while deleting intent");
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
          <div style={{ fontSize: "20px", fontWeight: 600 }}>
            Intents & Routing
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>
            Map customer intent to the right specialist.
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
            { id: "inbox", label: "Inbox", href: "#" },
            { id: "triage", label: "Triage & Routing", href: "#" },
            { id: "specialists", label: "AI Specialists", href: "/admin" },
            { id: "intents", label: "Intents & Routing", href: "/admin/intents", active: true },
            { id: "logs", label: "Logs", href: "/admin/logs" },
            { id: "settings", label: "Settings", href: "#" },
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
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflowY: "auto",
          }}
        >
          <section
            style={{
              borderRadius: "12px",
              border: "1px solid #1f2937",
              background: "#020617",
              padding: "16px",
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
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Intents</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  Detect customer intent and route to a specialist.
                </div>
              </div>
              <button
                onClick={handleCreateIntent}
                disabled={isSaving}
                style={{
                  padding: "8px 12px",
                  borderRadius: "999px",
                  border: "1px solid #374151",
                  background: "transparent",
                  color: "#e5e7eb",
                  fontSize: "12px",
                  cursor: isSaving ? "default" : "pointer",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                + Create Intent
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "260px 1fr",
                gap: 16,
              }}
            >
              <div
                style={{
                  border: "1px solid #1f2937",
                  borderRadius: "10px",
                  padding: 12,
                  background: "#0b1220",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                >
                  Intents
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {intents.map((intent) => {
                    const isSelected = intent.id === selectedIntentId;
                    return (
                      <button
                        key={intent.id}
                        onClick={() => setSelectedIntentId(intent.id)}
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
                          {intent.name}
                        </div>
                        <div
                          style={{ fontSize: 11, color: "#9ca3af" }}
                        >
                          {intent.description || "No description yet"}
                        </div>
                      </button>
                    );
                  })}
                  {intents.length === 0 && (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      No intents yet. Create one to start routing.
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #1f2937",
                  borderRadius: "10px",
                  padding: 12,
                }}
              >
                {!selectedIntent && (
                  <div style={{ fontSize: 13, color: "#9ca3af" }}>
                    Select an intent to edit.
                  </div>
                )}

                {selectedIntent && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        Intent name
                      </div>
                      <input
                        value={selectedIntent.name}
                        onChange={(e) =>
                          updateSelectedIntent({ name: e.target.value })
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
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        Description / when it should trigger
                      </div>
                      <textarea
                        value={selectedIntent.description}
                        onChange={(e) =>
                          updateSelectedIntent({ description: e.target.value })
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
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        Route to specialist
                      </div>
                      <select
                        value={selectedIntent.specialistId}
                        onChange={(e) =>
                          updateSelectedIntent({ specialistId: e.target.value })
                        }
                        style={{
                          width: "100%",
                          borderRadius: "8px",
                          border: "1px solid #374151",
                          background: "#020617",
                          color: "#e5e7eb",
                          padding: "8px",
                          fontSize: "12px",
                        }}
                      >
                        <option value="">-- Select specialist --</option>
                        {specialists.map((spec) => (
                          <option key={spec.id} value={spec.id}>
                            {spec.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-start",
                        marginTop: 4,
                      }}
                    >
                      <button
                        onClick={saveSelectedIntent}
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
                        Save intent
                      </button>
                      <button
                        onClick={handleDeleteSelectedIntent}
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
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
