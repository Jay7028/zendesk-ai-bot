"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { apiFetch } from "../../lib/api-client";
import { getCookie, withOrgPrefix } from "../../lib/org-path";

type OrgOption = { orgId: string; name: string; role: string; slug?: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [currentOrgSlug, setCurrentOrgSlug] = useState<string | null>(null);
  const inAdmin = useMemo(() => pathname?.includes("/admin"), [pathname]);

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
        const cookieOrgId = getCookie("org_id");
        const cookieOrgSlug = getCookie("org_slug");
        const fallback = data[0];
        const chosen =
          data.find((o) => o.orgId === cookieOrgId) ||
          data.find((o) => o.role === "owner") ||
          fallback;
        if (chosen) {
          setCurrentOrgId(chosen.orgId);
          setCurrentOrgSlug(cookieOrgSlug || chosen.slug || slugify(chosen.name || ""));
        }
      } catch {
        // ignore
      }
    }
    if (hasSession) loadOrgs();
  }, [hasSession, pathname]);

  // Redirect to slugged URL if available
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
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 700, color: "#111827" }}>Admin</div>
            <a
              href={withOrgPrefix("/admin/orgs", currentOrgSlug || undefined)}
              style={{
                fontSize: 13,
                color: "#1d4ed8",
                textDecoration: "none",
                border: "1px solid #c7d2fe",
                padding: "6px 10px",
                borderRadius: 8,
                background: "#eef2ff",
              }}
            >
              Org & Members
            </a>
          </div>
        </div>
      ) : null}
      {hasSession ? (
        <button
          onClick={async () => {
            try {
              await supabaseBrowser.auth.signOut();
            } finally {
              router.replace("/login");
            }
          }}
          style={{
            position: "fixed",
            left: 16,
            bottom: 16,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#111827",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            cursor: "pointer",
            fontSize: 13,
            zIndex: 20,
          }}
        >
          Sign out
        </button>
      ) : null}
      {children}
    </>
  );
}
