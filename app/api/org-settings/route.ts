import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, plan, status")
      .eq("id", orgId)
      .single();
    if (orgError) throw orgError;

    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from("org_settings")
      .select("branding, limits, ai_prefs")
      .eq("org_id", orgId)
      .maybeSingle();
    if (settingsError) throw settingsError;

    return NextResponse.json({
      organization: orgData,
      settings: settingsData || { branding: {}, limits: {}, ai_prefs: {} },
    });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("GET /api/org-settings error", e);
    return NextResponse.json({ error: "Failed to load org settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
    const body = await req.json();
    const name = (body.name || "").toString().trim();
    const slug = (body.slug || "").toString().trim();
    const branding = body.branding ?? {};
    const limits = body.limits ?? {};
    const aiPrefs = body.aiPrefs ?? {};

    if (!name) throw new HttpError(400, "Organization name is required");

    const { error: orgUpdateError } = await supabaseAdmin
      .from("organizations")
      .update({ name, slug })
      .eq("id", orgId);
    if (orgUpdateError) throw orgUpdateError;

    const { error: settingsError } = await supabaseAdmin
      .from("org_settings")
      .upsert({
        org_id: orgId,
        branding,
        limits,
        ai_prefs: aiPrefs,
      });
    if (settingsError) throw settingsError;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("POST /api/org-settings error", e);
    return NextResponse.json({ error: "Failed to save org settings" }, { status: 500 });
  }
}
