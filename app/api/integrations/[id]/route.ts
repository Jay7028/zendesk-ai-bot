import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import type { IntegrationConfig } from "../types";
import { HttpError, requireOrgContext } from "../../../../lib/auth";
import { encryptJSON } from "../../../../lib/credentials";

function dbToCamel(row: any, last4?: string): IntegrationConfig {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description ?? "",
    apiKey: "",
    apiKeyLast4: last4 || (row.api_key ? String(row.api_key).slice(-4) : undefined),
    baseUrl: row.base_url ?? "",
    enabled: !!row.enabled,
  };
}

function camelToDb(body: Partial<IntegrationConfig>) {
  return {
    id: body.id,
    name: body.name,
    type: body.type,
    description: body.description ?? "",
    api_key: body.apiKey ?? "",
    base_url: body.baseUrl ?? "",
    enabled: body.enabled ?? false,
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { id } = await context.params;
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let last4: string | undefined;
    const { data: credRow } = await supabaseAdmin
      .from("integration_credentials")
      .select("last4")
      .eq("integration_account_id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (credRow?.last4) last4 = credRow.last4;
    return NextResponse.json(dbToCamel(data, last4));
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgContext(request);
    const { id } = await context.params;
    const body = (await request.json()) as Partial<IntegrationConfig>;
    const record = {
      ...camelToDb({
        ...body,
        id,
        apiKey: body.apiKey ?? undefined,
      }),
      org_id: orgId,
    };

    // If this is Zendesk and no new apiKey was provided, do NOT overwrite existing api_key
    if (body.type === "zendesk" && (body.apiKey === undefined || body.apiKey === null || body.apiKey === "")) {
      delete (record as any).api_key;
    }

    const { data, error } = await supabaseAdmin
      .from("integrations")
      .update(record)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase PUT /integrations/:id error", error);
      return NextResponse.json(
        { error: "Failed to save integration", details: error?.message },
        { status: 500 }
      );
    }

    if (body.type === "zendesk" && body.apiKey) {
      const payload = encryptJSON({
        subdomain: body.baseUrl || data.base_url || "",
        email: body.description || data.description || "",
        token: body.apiKey || "",
      });
      if (payload) {
        await supabaseAdmin.from("integration_credentials").upsert({
          integration_account_id: data.id,
          org_id: orgId,
          kind: "api_key",
          encrypted_payload: payload,
          last4: body.apiKey.slice(-4),
        });
      }
    }

    let last4: string | undefined;
    const { data: credRow } = await supabaseAdmin
      .from("integration_credentials")
      .select("last4")
      .eq("integration_account_id", data.id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (credRow?.last4) last4 = credRow.last4;

    return NextResponse.json(dbToCamel(data, last4));
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { id } = await context.params;
    const { error } = await supabaseAdmin
      .from("integrations")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) {
      console.error("Supabase DELETE /integrations/:id error", error);
      return NextResponse.json(
        { error: "Failed to delete integration", details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
