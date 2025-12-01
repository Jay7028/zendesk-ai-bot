import { supabaseAdmin } from "./supabase";

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

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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

  const headerSlug = req.headers.get("x-org-slug");

  const pathSlug = (() => {
    try {
      const url = new URL(req.url);
      const segs = url.pathname.split("/").filter(Boolean);
      return segs[0] || null;
    } catch {
      return null;
    }
  })();

  const orgIdHeader = req.headers.get("x-org-id");
  if (orgIdHeader) {
    const member = memberships.find((m) => m.org_id === orgIdHeader);
    if (member) {
      const { data: orgRow } = await supabaseAdmin
        .from("organizations")
        .select("id, slug")
        .eq("id", orgIdHeader)
        .maybeSingle();
      if (orgRow) {
        return { orgId: orgRow.id, userId, role: member.role, slug: orgRow.slug || null };
      }
    }
  }

  let slugCandidate = headerSlug || pathSlug;
  const reservedSlugs = new Set(["admin", "api", "login", "logout"]);
  if (slugCandidate && reservedSlugs.has(slugCandidate.toLowerCase())) {
    slugCandidate = null;
  }

  if (slugCandidate) {
    const { data: orgRow } = await supabaseAdmin
      .from("organizations")
      .select("id, slug")
      .ilike("slug", slugify(slugCandidate))
      .maybeSingle();
    if (orgRow) {
      const member = memberships.find((m) => m.org_id === orgRow.id);
      const isOwner = memberships.some((m) => m.role === "owner");
      if (!member && !isOwner) {
        throw new HttpError(403, "Not a member of this organization");
      }
      return { orgId: orgRow.id, userId, role: member?.role || "owner", slug: orgRow.slug || slugCandidate };
    } else {
      // Slug was provided but no org found: deny access to avoid falling back to another org.
      throw new HttpError(404, "Organization not found");
    }
  }

  const cookieOrg = getCookie(req, "org_id");
  const selected = memberships.find((m) => m.org_id === cookieOrg);
  const orgId = (selected || memberships[0]).org_id as string;
  const role = (selected || memberships[0]).role as string;
  return { orgId, userId, role, slug: pathSlug || null };
}
