"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { apiFetch } from "../../lib/api-client";

type OrgOption = { orgId: string; name: string; role: string };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const inAdmin = useMemo(() => pathname?.startsWith("/admin"), [pathname]);

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      const session = data.session;
      setHasSession(!!session);
      setChecking(false);
      if (!session) {
        const next = encodeURIComponent(pathname || "/admin");
        router.replace(`/login?next=${next}`);
      }
    }
    checkSession();
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setHasSession(!!session);
      if (!session) {
        const next = encodeURIComponent(pathname || "/admin");
        router.replace(`/login?next=${next}`);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await apiFetch("/api/orgs");
        if (!res.ok) return;
        const data = (await res.json()) as OrgOption[];
        setOrgs(data);
        if (!currentOrgId && data[0]) setCurrentOrgId(data[0].orgId);
      } catch {
        // ignore
      }
    }
    if (hasSession) loadOrgs();
  }, [hasSession, currentOrgId]);

  async function handleOrgChange(orgId: string) {
    setCurrentOrgId(orgId);
    try {
      await apiFetch("/api/orgs", {
        method: "POST",
        body: JSON.stringify({ orgId }),
      });
      router.refresh();
    } catch {
      // ignore for now
    }
  }

  if (checking || hasSession === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
          color: "#111827",
        }}
      >
        Checking session…
      </div>
    );
  }

  if (!hasSession) {
    return null;
  }

  return (
    <>
      {inAdmin && orgs.length > 0 ? (
        <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
          }}
        >
          <div style={{ fontWeight: 700, color: "#111827" }}>Admin</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Organization:</label>
            <select
              value={currentOrgId || ""}
              onChange={(e) => handleOrgChange(e.target.value)}
              style={{
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 13,
              }}
            >
              {orgs.map((o) => (
                <option key={o.orgId} value={o.orgId}>
                  {o.name || "Org"} ({o.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
