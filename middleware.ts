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
    res.cookies.set("org_slug", maybeOrg);
    return res;
  }

  return NextResponse.next();
}
