import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import type { IntegrationConfig } from "./types";
import { HttpError, requireOrgContext } from "../../../lib/auth";
import { encryptJSON } from "../../../lib/credentials";

function dbToCamel(row: any): IntegrationConfig {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description ?? "",
    apiKey: row.api_key ?? "",
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

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .select("*")
      .eq("org_id", orgId)
      .neq("type", "openai");
    if (error) {
      console.error("Supabase GET /integrations error", error);
      return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 });
    }

    // Return raw values (including apiKey) so the UI can show what is stored
    return NextResponse.json((data ?? []).map((row) => dbToCamel(row)));
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { orgId } = await requireOrgContext(request);
    const body = (await request.json()) as Partial<IntegrationConfig>;
    const record = {
      ...camelToDb({
        name: body.name ?? "New Integration",
        type: body.type ?? "custom",
        description: body.type === "zendesk" ? body.description ?? "" : body.description ?? "",
        apiKey: body.apiKey ?? "",
        baseUrl: body.baseUrl ?? "",
        enabled: body.enabled ?? false,
      }),
      org_id: orgId,
    };

    if (!body.id) {
      delete (record as any).id;
    }

    const { data, error } = await supabaseAdmin.from("integrations").insert(record).select().single();

    if (error || !data) {
      console.error("Supabase POST /integrations error", error);
      return NextResponse.json(
        { error: "Failed to create integration", details: error?.message },
        { status: 500 }
      );
    }

    // Store Zendesk secret in integration_credentials if provided
    if (body.type === "zendesk" && body.apiKey) {
      const payload = encryptJSON({
        subdomain: body.baseUrl || "",
        email: body.description || "",
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

    return NextResponse.json(dbToCamel(data), { status: 201 });
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
