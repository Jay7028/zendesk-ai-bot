import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data, error } = await supabaseAdmin
      .from("org_memberships")
      .select("org_id, user_id, role, created_at")
      .eq("org_id", orgId);
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("GET /api/org-memberships error", e);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}
