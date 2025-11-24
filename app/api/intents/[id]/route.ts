import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import type { IntentConfig } from "../types";

function dbToCamel(row: any): IntentConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    specialistId: row.specialist_id ?? null,
  };
}

function camelToDb(body: Partial<IntentConfig>) {
  return {
    id: body.id,
    name: body.name,
    description: body.description ?? "",
    specialist_id: body.specialistId || null,
  };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("intents")
    .select("*")
    .eq("id", id)
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
  const body = (await request.json()) as Partial<IntentConfig>;
  const dbRecord = camelToDb({ ...body, id });

  const { data, error } = await supabaseAdmin
    .from("intents")
    .update(dbRecord)
    .eq("id", id)
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
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { error } = await supabaseAdmin.from("intents").delete().eq("id", id);

  if (error) {
    console.error("Supabase DELETE /intents/:id error", error);
    return NextResponse.json(
      { error: "Failed to delete intent", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
