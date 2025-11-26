import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../../lib/auth";

async function testZendesk(integrationId: string, orgId: string) {
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("org_id", orgId)
    .eq("enabled", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Integration not found or disabled");
  const subdomain = (data.base_url || "").replace(/https?:\/\//i, "").replace(/\.zendesk\.com/i, "").trim();
  const email = data.description || "";
  const token = data.api_key || "";
  if (!subdomain || !email || !token) throw new HttpError(400, "Zendesk credentials incomplete");

  const auth = Buffer.from(`${email}/token:${token}`).toString("base64");
  const url = `https://${subdomain}.zendesk.com/api/v2/users/me.json`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new HttpError(res.status, `Zendesk test failed: ${text.slice(0, 300)}`);
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
    const body = await req.json();
    const integrationId = (body.integrationId || "").toString();
    if (!integrationId) throw new HttpError(400, "integrationId required");
    const { data: integration } = await supabaseAdmin
      .from("integrations")
      .select("type")
      .eq("id", integrationId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!integration) throw new HttpError(404, "Integration not found");
    if (integration.type !== "zendesk") throw new HttpError(400, "Only Zendesk test supported");

    const result = await testZendesk(integrationId, orgId);
    return NextResponse.json(result);
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("POST /api/integrations/test error", e);
    return NextResponse.json({ error: "Failed to test integration" }, { status: 500 });
  }
}
