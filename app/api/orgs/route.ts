import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!token) throw new HttpError(401, "Unauthorized");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
      token.replace(/^Bearer\s+/i, "")
    );
    if (userError || !userData?.user) throw new HttpError(401, "Unauthorized");

    const userId = userData.user.id;
    const { data, error } = await supabaseAdmin
      .from("org_memberships")
      .select("org_id, role, organizations(name, slug, plan, status)")
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json(
      (data || []).map((m) => ({
        orgId: m.org_id,
        role: m.role,
        name: (m as any).organizations?.name ?? "",
        slug: (m as any).organizations?.slug ?? "",
        plan: (m as any).organizations?.plan ?? "",
        status: (m as any).organizations?.status ?? "",
      }))
    );
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("GET /api/orgs error", e);
    return NextResponse.json({ error: "Failed to load orgs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await req.json();
    if (!orgId) throw new HttpError(400, "orgId required");
    const ctx = await requireOrgContext(req);

    const { data: membership, error } = await supabaseAdmin
      .from("org_memberships")
      .select("org_id")
      .eq("user_id", ctx.userId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (error) throw error;
    if (!membership) throw new HttpError(403, "Not a member of that org");

    const res = NextResponse.json({ ok: true });
    res.headers.set(
      "Set-Cookie",
      `org_id=${encodeURIComponent(orgId)}; Path=/; HttpOnly; SameSite=Lax; Secure`
    );
    return res;
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("POST /api/orgs error", e);
    return NextResponse.json({ error: "Failed to select org" }, { status: 500 });
  }
}
