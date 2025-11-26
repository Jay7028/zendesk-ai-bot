import { supabaseBrowser } from "./supabase-browser";

type FetchArgs = Parameters<typeof fetch>;

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error) throw new Error("Failed to get session");
  return data.session?.access_token || null;
}

export async function apiFetch(input: FetchArgs[0], init: FetchArgs[1] = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
