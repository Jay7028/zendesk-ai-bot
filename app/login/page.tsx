"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/admin", [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? null;
      setSessionUser(email);
      if (email) {
        router.replace(nextPath);
      }
    });
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      setSessionUser(session?.user?.email ?? null);
      if (event === "SIGNED_OUT") {
        setMessage("Signed out");
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [nextPath, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (!email || !password) {
        setError("Email and password are required");
        return;
      }
      if (mode === "signUp") {
        const { error: signUpError } = await supabaseBrowser.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        setMessage("Check your email to confirm, then sign in.");
      } else {
        const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        setMessage("Signed in");
        router.replace(nextPath);
      }
    } catch (e: any) {
      setError(e.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await supabaseBrowser.auth.signOut();
    } catch (e: any) {
      setError(e.message || "Sign-out failed");
    } finally {
      setLoading(false);
    }
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Sign in</h1>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>
          Use your email/password to manage the admin tools.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setMode("signIn")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: mode === "signIn" ? "1px solid #4f46e5" : "1px solid #e5e7eb",
              background: mode === "signIn" ? "#eef2ff" : "#fff",
              color: mode === "signIn" ? "#312e81" : "#111827",
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signUp")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: mode === "signUp" ? "1px solid #4f46e5" : "1px solid #e5e7eb",
              background: mode === "signUp" ? "#eef2ff" : "#fff",
              color: mode === "signUp" ? "#312e81" : "#111827",
              cursor: "pointer",
            }}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                fontSize: 14,
              }}
              required
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                fontSize: 14,
              }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: "12px 14px",
              borderRadius: 10,
              border: "none",
              background: "#4f46e5",
              color: "#fff",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Working..." : mode === "signUp" ? "Create account" : "Sign in"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 14 }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ marginTop: 12, color: "#16a34a", fontSize: 14 }}>
            {message}
          </div>
        )}
        {sessionUser && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>Signed in as</div>
            <div style={{ fontWeight: 600 }}>{sessionUser}</div>
            <button
              onClick={handleSignOut}
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}
