import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { HttpError, requireOrgContext, requireUser } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const orgQuery = req.nextUrl.searchParams.get("orgId");
    // Default to cookie-selected org
    let { orgId } = await requireOrgContext(req);
    if (orgQuery) {
      orgId = orgQuery;
    }

    // Ensure user is a member of requested org
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("org_memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new HttpError(403, "Not a member of this org");

    const { data: memberRows, error: memberError } = await supabaseAdmin
      .from("org_memberships")
      .select("org_id, user_id, role, created_at")
      .eq("org_id", orgId);
    if (memberError) throw memberError;

    const userIds = (memberRows || []).map((m) => m.user_id);
    let profiles: Record<string, { name?: string | null; email?: string | null }> = {};
    if (userIds.length) {
      const { data: profileRows } = await supabaseAdmin
        .from("user_profiles")
        .select("user_id, name")
        .in("user_id", userIds);
      profileRows?.forEach((p) => {
        profiles[p.user_id] = { name: p.name };
      });
      const { data: authRows } = await supabaseAdmin.auth.admin.listUsers();
      authRows?.users?.forEach((u) => {
        if (userIds.includes(u.id)) {
          profiles[u.id] = { ...profiles[u.id], email: u.email };
        }
      });
    }

    return NextResponse.json(
      (memberRows || []).map((m) => ({
        ...m,
        profiles: profiles[m.user_id] ?? null,
      }))
    );
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("GET /api/org-memberships error", e);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}
