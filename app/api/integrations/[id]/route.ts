import { NextResponse } from "next/server";
import { defaultOrgId, supabaseAdmin } from "../../../../lib/supabase";
import type { IntegrationConfig } from "../types";

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

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("*")
    .eq("id", id)
    .eq("org_id", defaultOrgId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(dbToCamel(data));
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as Partial<IntegrationConfig>;
  const record = { ...camelToDb({ ...body, id }), org_id: defaultOrgId };

  const { data, error } = await supabaseAdmin
    .from("integrations")
    .update(record)
    .eq("id", id)
    .eq("org_id", defaultOrgId)
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase PUT /integrations/:id error", error);
    return NextResponse.json(
      { error: "Failed to save integration", details: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json(dbToCamel(data));
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { error } = await supabaseAdmin
    .from("integrations")
    .delete()
    .eq("id", id)
    .eq("org_id", defaultOrgId);

  if (error) {
    console.error("Supabase DELETE /integrations/:id error", error);
    return NextResponse.json(
      { error: "Failed to delete integration", details: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
