"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase-browser";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

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

  return <>{children}</>;
}
