import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { HttpError, requireUser } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const name = (body.name || "").toString().trim();
    const slug = (body.slug || "").toString().trim();
    if (!name) throw new HttpError(400, "Organization name is required");

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name,
        slug: slug || null,
        status: "active",
        plan: "free",
      })
      .select()
      .single();
    if (orgError) throw orgError;

    const { error: memberError } = await supabaseAdmin
      .from("org_memberships")
      .insert({ org_id: org.id, user_id: user.id, role: "owner" });
    if (memberError) throw memberError;

    const { error: settingsError } = await supabaseAdmin
      .from("org_settings")
      .upsert({ org_id: org.id, branding: {}, limits: {}, ai_prefs: {} });
    if (settingsError) throw settingsError;

    const res = NextResponse.json({ orgId: org.id, org });
    res.headers.set(
      "Set-Cookie",
      `org_id=${encodeURIComponent(org.id)}; Path=/; HttpOnly; SameSite=Lax; Secure`
    );
    return res;
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("POST /api/orgs/create error", e);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
