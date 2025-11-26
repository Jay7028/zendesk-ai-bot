import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../../lib/auth";
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
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { id } = await context.params;
    const { data, error } = await supabaseAdmin
      .from("data_fields")
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
    const body = (await request.json()) as Partial<DataField>;
    const record = { ...camelToDb({ ...body, id }), org_id: orgId };

    const { data, error } = await supabaseAdmin
      .from("data_fields")
      .update(record)
      .eq("id", id)
      .eq("org_id", orgId)
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
      .from("data_fields")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) {
      console.error("Supabase DELETE /data-extraction/:id error", error);
      return NextResponse.json(
        { error: "Failed to delete data field", details: error.message },
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
