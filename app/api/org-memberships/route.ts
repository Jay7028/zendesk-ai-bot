import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
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
