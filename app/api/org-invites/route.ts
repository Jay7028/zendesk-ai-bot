import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../lib/auth";

function sevenDaysFromNow() {
  const dt = new Date();
  dt.setDate(dt.getDate() + 7);
  return dt.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data, error } = await supabaseAdmin
      .from("org_invites")
      .select("id, email, role, status, expires_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("GET /api/org-invites error", e);
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, role: ctxRole } = await requireOrgContext(req);
    if (!["owner", "admin"].includes(ctxRole)) throw new HttpError(403, "Admin or owner required");
    const body = await req.json();
    const email = (body.email || "").toString().trim().toLowerCase();
    const role = (body.role || "agent").toString();
    if (!email) throw new HttpError(400, "Email is required");
    const token = crypto.randomBytes(16).toString("hex");
    const expires = sevenDaysFromNow();
    const { data, error } = await supabaseAdmin
      .from("org_invites")
      .insert({
        org_id: orgId,
        email,
        role,
        token,
        status: "pending",
        expires_at: expires,
      })
      .select()
      .single();
    if (error) throw error;
    // TODO: send email; for now, return token for debugging.
    return NextResponse.json({ invite: data, token }, { status: 201 });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("POST /api/org-invites error", e);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
