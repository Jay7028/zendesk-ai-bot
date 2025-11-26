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

export async function requireOrgContext(req: Request) {
  const token = getAuthToken(req);
  if (!token) throw new HttpError(401, "Unauthorized");

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new HttpError(401, "Invalid or expired token");
  }
  const userId = userData.user.id;

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("org_memberships")
    .select("org_id, role")
    .eq("user_id", userId);

  if (membershipError) {
    throw new HttpError(500, "Failed to load organization membership");
  }
  if (!memberships || memberships.length === 0) {
    throw new HttpError(403, "No organization membership found");
  }

  const orgId = memberships[0].org_id as string;
  const role = memberships[0].role as string;

  return { orgId, userId, role };
}
