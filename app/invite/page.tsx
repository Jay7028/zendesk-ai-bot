"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api-client";
import { supabaseBrowser } from "../../lib/supabase-browser";

function InviteAcceptForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => params.get("token") || "", [params]);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function ensureSession() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        // Require login first
        router.replace(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`);
      }
    }
    if (token) ensureSession();
  }, [router, token]);

  async function handleAccept() {
    setStatus("working");
    setError(null);
    try {
      const res = await apiFetch("/api/org-invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data?.error || "Failed to accept invite");
        return;
      }
      setStatus("done");
      // org_id cookie set on server; go to admin
      router.replace("/admin");
    } catch (e: any) {
      setStatus("error");
      setError(e.message || "Failed to accept invite");
    }
  }

  if (!token) {
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
        Missing invite token.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
        color: "#0f172a",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Accept invite</h1>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>Join the organization associated with this invite.</p>

        <button
          onClick={handleAccept}
          disabled={status === "working"}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #c7d2fe",
            background: "#eef2ff",
            color: "#1d4ed8",
            fontWeight: 700,
            cursor: status === "working" ? "not-allowed" : "pointer",
          }}
        >
          {status === "working" ? "Joining..." : "Join org"}
        </button>

        {status === "done" && (
          <div style={{ marginTop: 12, color: "#16a34a" }}>Joined successfully. Redirecting…</div>
        )}
        {status === "error" && (
          <div style={{ marginTop: 12, color: "#b91c1c" }}>{error || "Failed to accept invite"}</div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
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
          Loading…
        </div>
      }
    >
      <InviteAcceptForm />
    </Suspense>
  );
}
