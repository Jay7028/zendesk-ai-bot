import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { HttpError, requireUser } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const token = (body.token || "").toString().trim();
    if (!token) throw new HttpError(400, "token required");

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("org_invites")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle();
    if (inviteError) throw inviteError;
    if (!invite) throw new HttpError(404, "Invite not found or already used");

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new HttpError(400, "Invite expired");
    }

    // Upsert membership
    const { error: memberError } = await supabaseAdmin
      .from("org_memberships")
      .upsert({
        org_id: invite.org_id,
        user_id: user.id,
        role: invite.role || "agent",
      });
    if (memberError) throw memberError;

    // Mark invite accepted
    const { error: updateError } = await supabaseAdmin
      .from("org_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);
    if (updateError) throw updateError;

    // Set cookie to switch org
    const res = NextResponse.json({ ok: true, orgId: invite.org_id });
    res.headers.set(
      "Set-Cookie",
      `org_id=${encodeURIComponent(invite.org_id)}; Path=/; HttpOnly; SameSite=Lax; Secure`
    );
    return res;
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("POST /api/org-invites/accept error", e);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
