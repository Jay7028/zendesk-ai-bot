import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../../lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { orgId, role: myRole } = await requireOrgContext(req);
    if (!["owner", "admin"].includes(myRole)) throw new HttpError(403, "Admin or owner required");
    const { userId } = await context.params;
    const body = await req.json();
    const newRole = (body.role || "").toString();
    if (!["owner", "admin", "agent", "viewer"].includes(newRole)) {
      throw new HttpError(400, "Invalid role");
    }
    const { error } = await supabaseAdmin
      .from("org_memberships")
      .update({ role: newRole })
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("POST /api/org-memberships/[userId] error", e);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { orgId, role: myRole } = await requireOrgContext(req);
    if (!["owner", "admin"].includes(myRole)) throw new HttpError(403, "Admin or owner required");
    const { userId } = await context.params;
    const { data: owners, error: ownersError } = await supabaseAdmin
      .from("org_memberships")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("role", "owner");
    if (ownersError) throw ownersError;
    if (owners && owners.length <= 1 && owners[0]?.user_id === userId) {
      throw new HttpError(400, "Cannot remove the last owner");
    }
    const { error } = await supabaseAdmin
      .from("org_memberships")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("DELETE /api/org-memberships/[userId] error", e);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
