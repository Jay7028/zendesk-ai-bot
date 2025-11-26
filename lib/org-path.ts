// Lightweight helpers for working with org-prefixed paths and cookies.

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function withOrgPrefix(path: string, slug?: string | null): string {
  const targetSlug = slug || getCookie("org_slug");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!targetSlug) return normalizedPath;
  const withSlug = `/${targetSlug}${normalizedPath}`;
  return withSlug.replace(/\/{2,}/g, "/");
}
