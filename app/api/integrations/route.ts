import { NextResponse } from "next/server";
import { defaultOrgId, supabaseAdmin } from "../../../lib/supabase";
import type { IntegrationConfig } from "./types";

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

export async function GET() {
  const { data, error } = await supabaseAdmin.from("integrations").select("*").eq("org_id", defaultOrgId);
  if (error) {
    console.error("Supabase GET /integrations error", error);
    return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 });
  }
  return NextResponse.json((data ?? []).map(dbToCamel));
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<IntegrationConfig>;
  const record = {
    ...camelToDb({
      name: body.name ?? "New Integration",
      type: body.type ?? "custom",
      description: body.description ?? "",
      apiKey: body.apiKey ?? "",
      baseUrl: body.baseUrl ?? "",
      enabled: body.enabled ?? false,
    }),
    org_id: defaultOrgId,
  };

  if (!body.id) {
    delete (record as any).id;
  }

  const { data, error } = await supabaseAdmin
    .from("integrations")
    .insert(record)
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase POST /integrations error", error);
    return NextResponse.json(
      { error: "Failed to create integration", details: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json(dbToCamel(data), { status: 201 });
}
