import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && segments[1] === "admin") {
    // path like /{org}/admin/...
    segments.shift(); // drop org slug but keep URL in browser
    url.pathname = "/" + segments.join("/");
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*/admin/:path*"],
};
