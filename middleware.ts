import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rewrite /:org/... to the existing routes while preserving the slug in the URL via cookies/headers.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip Next internals and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);

  // If user hits /admin/... without a slug but has org_slug cookie, redirect them to their org-scoped URL
  if (segments[0] === "admin" && segments.length >= 1) {
    const cookieSlug = req.cookies.get("org_slug")?.value;
    if (cookieSlug) {
      const url = req.nextUrl.clone();
      url.pathname = `/${cookieSlug}${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  if (segments.length < 2) {
    return NextResponse.next();
  }

  const [maybeOrg, ...rest] = segments;
  const first = rest[0];

  // Only rewrite when the path includes one of our app sections after the org slug.
  if (["admin", "homepage", "login", "invite"].includes(first)) {
    const url = req.nextUrl.clone();
    url.pathname = "/" + rest.join("/");

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-org-slug", maybeOrg);

    const res = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
    res.cookies.set("org_slug", maybeOrg, { httpOnly: false, path: "/" });
    return res;
  }

  return NextResponse.next();
}
