"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { apiFetch } from "../../lib/api-client";
import { withOrgPrefix, getCookie } from "../../lib/org-path";

type OrgOption = { orgId: string; name: string; role: string };

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
        // Owners can choose; non-owners stick to first membership
        const ownerOrg = data.find((o) => o.role === "owner");
        const chosen =
          ownerOrg && cookieOrgId === ownerOrg.orgId
            ? ownerOrg
            : ownerOrg && cookieOrgId === ownerOrg.orgId
            ? ownerOrg
            : ownerOrg || fallback;
        if (chosen) {
          setCurrentOrgId(chosen.orgId);
          setCurrentOrgSlug(cookieOrgSlug || (chosen as any).slug || slugify(chosen.name || ""));
        }
      } catch {
        // ignore
      }
    }
    if (hasSession) loadOrgs();
  }, [hasSession, pathname]);

  // Selection now happens in Org & Members; no dropdown here.

  // Redirect to slugged URL if available
  useEffect(() => {
    if (!currentOrgSlug) return;
    if (!pathname?.startsWith("/admin")) return;
    const first = pathname.split("/")[1];
    if (first === currentOrgSlug) return;
    const nextPath = `/${currentOrgSlug}${pathname}`;
    router.replace(nextPath);
  }, [pathname, router, currentOrgSlug]);

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
            href={withOrgPrefix("/admin/orgs", currentOrgSlug)}
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
      {children}
    </>
  );
}
