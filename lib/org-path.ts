export function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const cookieHeader = document.cookie || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const c of cookies) {
    const [k, ...rest] = c.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function withOrgPrefix(path: string, slug?: string | null) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const cookieSlug = typeof document !== "undefined" ? getCookie("org_slug") : null;
  const effective = slug || cookieSlug;
  return effective ? `/${effective}${normalized}` : normalized;
}
