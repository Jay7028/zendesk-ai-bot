import { supabaseAdmin, defaultOrgId } from "./supabase";

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

  // Auto-provision into default org if no membership exists.
  if ((!memberships || memberships.length === 0) && defaultOrgId) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("org_memberships")
      .insert({
        org_id: defaultOrgId,
        user_id: userId,
        role: "owner",
      })
      .select("org_id, role")
      .single();
    if (insertError) {
      throw new HttpError(403, "No organization membership found");
    }
    memberships = [inserted];
  }

  if (!memberships || memberships.length === 0) {
    throw new HttpError(403, "No organization membership found");
  }

  const cookieOrg = getCookie(req, "org_id");
  const selected = memberships.find((m) => m.org_id === cookieOrg);
  const orgId = (selected || memberships[0]).org_id as string;
  const role = (selected || memberships[0]).role as string;

  return { orgId, userId, role };
}
