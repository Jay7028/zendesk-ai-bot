import { supabaseBrowser } from "./supabase-browser";
import { getCookie } from "./org-path";

type FetchArgs = Parameters<typeof fetch>;

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error) throw new Error("Failed to get session");
  return data.session?.access_token || null;
}

function currentSlug() {
  if (typeof window === "undefined") return null;
  const segs = window.location.pathname.split("/").filter(Boolean);
  const maybeSlug = segs[0] || null;
  return maybeSlug || getCookie("org_slug");
}

function currentOrgId() {
  if (typeof window === "undefined") return null;
  return getCookie("org_id");
}

export async function apiFetch(input: FetchArgs[0], init: FetchArgs[1] = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  const slug = currentSlug();
  if (slug) headers.set("x-org-slug", slug);
  const orgId = currentOrgId();
  if (orgId) headers.set("x-org-id", orgId);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
