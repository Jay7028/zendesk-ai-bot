import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length >= 2 && segments[1] === "admin") {
    // path like /{org}/admin/...
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*/admin/:path*"],
};
