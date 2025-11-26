import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../../lib/auth";
import type { IntentConfig } from "../types";

function dbToCamel(row: any): IntentConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    specialistId: row.specialist_id ?? null,
    orgId: row.org_id ?? undefined,
  };
}

function camelToDb(body: Partial<IntentConfig>) {
  return {
    id: body.id,
    name: body.name,
    description: body.description ?? "",
    specialist_id: body.specialistId ?? null,
    org_id: body.orgId ?? null,
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
      .from("intents")
      .select("*")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(dbToCamel(data));
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /intents/:id unexpected error", err);
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
    const body = (await request.json()) as Partial<IntentConfig>;
    const dbRecord = { ...camelToDb({ ...body, id, orgId }) };

    const { data, error } = await supabaseAdmin
      .from("intents")
      .update(dbRecord)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase PUT /intents/:id error", error);
      return NextResponse.json(
        { error: "Failed to save intent", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(dbToCamel(data));
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PUT /intents/:id unexpected error", err);
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
      .from("intents")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) {
      console.error("Supabase DELETE /intents/:id error", error);
      return NextResponse.json(
        { error: "Failed to delete intent", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("DELETE /intents/:id unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
