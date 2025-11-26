import { NextResponse } from "next/server";
import { defaultOrgId, supabaseAdmin } from "../../../../lib/supabase";
import type { DataField } from "../types";

function dbToCamel(row: any): DataField {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    description: row.description ?? "",
    example: row.example ?? "",
    required: !!row.required,
  };
}

function camelToDb(body: Partial<DataField>) {
  return {
    id: body.id,
    name: body.name,
    label: body.label,
    description: body.description ?? "",
    example: body.example ?? "",
    required: body.required ?? false,
  };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { data, error } = await supabaseAdmin
    .from("data_fields")
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
  const body = (await request.json()) as Partial<DataField>;
  const record = { ...camelToDb({ ...body, id }), org_id: defaultOrgId };

  const { data, error } = await supabaseAdmin
    .from("data_fields")
    .update(record)
    .eq("id", id)
    .eq("org_id", defaultOrgId)
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase PUT /data-extraction/:id error", error);
    return NextResponse.json(
      { error: "Failed to save data field", details: error?.message },
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
    .from("data_fields")
    .delete()
    .eq("id", id)
    .eq("org_id", defaultOrgId);

  if (error) {
    console.error("Supabase DELETE /data-extraction/:id error", error);
    return NextResponse.json(
      { error: "Failed to delete data field", details: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
