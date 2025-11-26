"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "../../../lib/api-client";
import { withOrgPrefix, getCookie } from "../../../lib/org-path";

type InviteRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  token?: string;
  expires_at?: string;
  created_at?: string;
};

type MemberRow = {
  org_id: string;
  user_id: string;
  role: string;
  created_at?: string;
  profiles?: { name?: string | null; email?: string | null } | null;
};

type OrgRow = {
  orgId: string;
  name: string;
  role: string;
  slug?: string;
  plan?: string;
  status?: string;
};

const NAV_ITEMS = [
  { id: "home", label: "Home", href: "/" },
  { id: "specialists", label: "AI Specialists", href: "/admin/specialists" },
  { id: "intents", label: "Intents", href: "/admin/intents" },
  { id: "data-extraction", label: "Data Extraction", href: "/admin/data-extraction" },
  { id: "integrations", label: "Integrations", href: "/admin/integrations" },
  { id: "logs", label: "Logs", href: "/admin/logs" },
  { id: "test-ai", label: "Test AI", href: "/admin/test-ai" },
  { id: "track", label: "Track", href: "/admin/track" },
  { id: "orgs", label: "Org & Members", href: "/admin/orgs", active: true },
  { id: "org-settings", label: "Org Settings", href: "/admin/orgs/settings" },
];

function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
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
}

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export default function OrgPage() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "admin" | "agent" | "viewer">("agent");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgMessage, setOrgMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const selectedOrg = useMemo(() => orgs.find((o) => o.orgId === selectedOrgId) || null, [orgs, selectedOrgId]);

  const activeNav = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        active: item.id === "orgs",
      })),
    []
  );

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const orgRes = await apiFetch("/api/orgs");
      const orgData = (await orgRes.json()) as OrgRow[];
      const filtered = (orgData || []).filter((o) => o.status !== "deleted");
      setOrgs(filtered);

      const cookieSlug = getCookie("org_slug")?.toLowerCase();
      const chosen = filtered.find((o) => o.slug?.toLowerCase() === cookieSlug) || filtered[0] || null;
      if (chosen) setSelectedOrgId(chosen.orgId);

      const targetOrg = chosen?.orgId || null;
      const [invRes, memRes] = await Promise.all([
        apiFetch("/api/org-invites"),
        targetOrg ? apiFetch(`/api/org-memberships?orgId=${targetOrg}`) : apiFetch("/api/org-memberships"),
      ]);
      if (!invRes.ok) throw new Error("Failed to load invites");
      if (!memRes.ok) throw new Error("Failed to load members");
      setInvites((await invRes.json()) as InviteRow[]);
      setMembers((await memRes.json()) as MemberRow[]);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateInvite() {
    if (!email.trim()) {
      setInviteMessage("Email is required");
      return;
    }
    setInviteMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/org-invites", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to create invite");
        return;
      }
      setInviteMessage(`Invite created. Token (for testing): ${data.token || "sent"}`);
      setEmail("");
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to create invite");
    }
  }

  async function handleCreateOrg() {
    if (!orgName.trim()) {
      setOrgMessage("Name is required");
      return;
    }
    // Always keep slug in sync with name (lowercase, hyphenated)
    const finalSlug = orgSlug || slugify(orgName);
    setOrgSlug(finalSlug);
    setOrgMessage(null);
    setError(null);
    try {
      const res = await apiFetch("/api/orgs/create", {
        method: "POST",
        body: JSON.stringify({ name: orgName, slug: finalSlug }),
      });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Failed to create org");
          return;
        }
      setOrgMessage("Organization created.");
      setOrgName("");
      setOrgSlug("");
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to create org");
    }
  }

  async function handleDeleteOrg() {
    if (!selectedOrgId) return;
    const confirmed = window.confirm("Delete this organization? This cannot be undone.");
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/orgs", {
        method: "DELETE",
        body: JSON.stringify({ orgId: selectedOrgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to delete org");
        return;
      }
      setOrgMessage("Organization deleted.");
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to delete org");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: MemberRow["role"]) {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/org-memberships/${encodeURIComponent(userId)}`, {
        method: "POST",
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to update role");
        return;
      }
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(userId: string) {
    const confirmed = window.confirm("Remove this member from the org?");
    if (!confirmed) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/org-memberships/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to remove member");
        return;
      }
      await loadData();
    } catch (e: any) {
      setError(e.message || "Failed to remove member");
    } finally {
      setLoading(false);
    }
  }

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
        {activeNav.map((item) => (
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

      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Organization & Members</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Invite teammates and manage roles.</div>
        </div>

        {error && (
          <div style={{ color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 10 }}>{error}</div>
        )}
        {inviteMessage && (
          <div style={{ color: "#166534", background: "#dcfce7", padding: 12, borderRadius: 10 }}>
            {inviteMessage}
          </div>
        )}
        {orgMessage && (
          <div style={{ color: "#166534", background: "#dcfce7", padding: 12, borderRadius: 10 }}>{orgMessage}</div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Card title="Your organizations">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {orgs.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 13 }}>No orgs yet.</div>
              ) : (
                orgs.map((o) => {
                  const active = o.orgId === selectedOrgId;
                  return (
                    <div
                      key={o.orgId}
                      style={{
                        border: active ? "1px solid #c7d2fe" : "1px solid #e5e7eb",
                        background: active ? "#eef2ff" : "#f9fafb",
                        borderRadius: 10,
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{o.name || "Org"}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>
                          Role: {o.role} {o.slug ? `· ${o.slug}` : ""}
                        </div>
                      </div>
                      {active && (
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: "1px solid #c7d2fe",
                            background: "#eef2ff",
                            color: "#4338ca",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card title="Create organization">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Name</div>
                <input
                  value={orgName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrgName(val);
                      setOrgSlug(slugify(val));
                    }}
                    placeholder="Acme Support"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              {/* Slug is kept in sync with name; no need to expose it */}
              <input type="hidden" value={orgSlug} readOnly />
              <button
                onClick={handleCreateOrg}
                disabled={loading}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #c7d2fe",
                  background: "#eef2ff",
                  color: "#1d4ed8",
                  fontWeight: 700,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                {loading ? "Working..." : "Create org"}
              </button>
            </div>
          </Card>

          <Card title="Delete organization (owner only)">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ color: "#b91c1c", fontSize: 13 }}>
                This will mark the organization as deleted. You can’t undo this.
              </div>
              <button
                onClick={handleDeleteOrg}
                disabled={loading || !selectedOrg || selectedOrg.role !== "owner"}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #fca5a5",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontWeight: 700,
                  cursor: loading || !selectedOrg || selectedOrg.role !== "owner" ? "not-allowed" : "pointer",
                  alignSelf: "flex-start",
                }}
              >
                {loading ? "Working..." : "Delete org"}
              </button>
            </div>
          </Card>

          <Card title="Invite user">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Role</div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button
                onClick={handleCreateInvite}
                disabled={loading}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #c7d2fe",
                  background: "#eef2ff",
                  color: "#1d4ed8",
                  fontWeight: 700,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                {loading ? "Working..." : "Send invite"}
              </button>
            </div>
          </Card>
        </div>

        <Card title="Members">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {members.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No members yet.</div>
            ) : (
              members.map((m) => (
                <div
                  key={m.user_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: "#f9fafb",
                    fontSize: 13,
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.profiles?.name || m.user_id}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{m.profiles?.email || ""}</div>
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "#eef2ff",
                          border: "1px solid #c7d2fe",
                          color: "#312e81",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {m.role}
                      </span>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value as MemberRow["role"])}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          fontSize: 13,
                        }}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="agent">Agent</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                      Joined {m.created_at ? new Date(m.created_at).toLocaleDateString() : "-"}
                    </div>
                    <button
                      onClick={() => handleRemove(m.user_id)}
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
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Invites">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invites.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: 13 }}>No invites yet.</div>
            ) : (
              invites.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 12,
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{inv.email}</div>
                    <div style={{ color: "#6b7280" }}>Role: {inv.role}</div>
                    <div style={{ color: "#6b7280" }}>Status: {inv.status}</div>
                    <div style={{ color: "#6b7280" }}>
                      Expires: {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "-"}
                    </div>
                    {inv.token && (
                      <div style={{ color: "#0f172a", marginTop: 4 }}>
                        Token (for testing): <span style={{ fontFamily: "monospace", fontSize: 12 }}>{inv.token}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    Sent {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
