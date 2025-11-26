import { supabaseAdmin } from "./supabase";
import { slugify } from "./org-path";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getAuthToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function getCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const c of cookies) {
    const [k, ...rest] = c.split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function requireUser(req: Request) {
  const token = getAuthToken(req);
  if (!token) throw new HttpError(401, "Unauthorized");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new HttpError(401, "Invalid or expired token");
  }
  return userData.user;
}

export async function requireOrgContext(req: Request) {
  const token = getAuthToken(req);
  if (!token) throw new HttpError(401, "Unauthorized");

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new HttpError(401, "Invalid or expired token");
  }
  const userId = userData.user.id;

  let { data: memberships, error: membershipError } = await supabaseAdmin
    .from("org_memberships")
    .select("org_id, role")
    .eq("user_id", userId);

  if (membershipError) {
    throw new HttpError(500, "Failed to load organization membership");
  }

  if (!memberships || memberships.length === 0) {
    throw new HttpError(403, "No organization membership found");
  }

  const pathSlug = (() => {
    try {
      const url = new URL(req.url);
      const segs = url.pathname.split("/").filter(Boolean);
      return segs[0] || null;
    } catch {
      return null;
    }
  })();

  if (pathSlug) {
    const { data: orgRow } = await supabaseAdmin
      .from("organizations")
      .select("id, slug")
      .ilike("slug", slugify(pathSlug))
      .maybeSingle();
    if (orgRow) {
      const member = memberships.find((m) => m.org_id === orgRow.id);
      const isOwner = memberships.some((m) => m.role === "owner");
      if (!member && !isOwner) {
        throw new HttpError(403, "Not a member of this organization");
      }
      return { orgId: orgRow.id, userId, role: member?.role || "owner", slug: orgRow.slug || pathSlug };
    }
  }

  const cookieOrg = getCookie(req, "org_id");
  const selected = memberships.find((m) => m.org_id === cookieOrg);
  const orgId = (selected || memberships[0]).org_id as string;
  const role = (selected || memberships[0]).role as string;
  return { orgId, userId, role, slug: pathSlug || null };
}
