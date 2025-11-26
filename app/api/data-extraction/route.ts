import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import type { DataField } from "./types";
import { HttpError, requireOrgContext } from "../../../lib/auth";

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

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data, error } = await supabaseAdmin.from("data_fields").select("*").eq("org_id", orgId);
    if (error) {
      console.error("Supabase GET /data-extraction error", error);
      return NextResponse.json(
        { error: "Failed to load data extraction fields" },
        { status: 500 }
      );
    }
    return NextResponse.json((data ?? []).map(dbToCamel));
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
    const body = (await request.json()) as Partial<DataField>;
    const record = {
      ...camelToDb({
        name: body.name ?? "field_key",
        label: body.label ?? "New Field",
        description: body.description ?? "",
        example: body.example ?? "",
        required: body.required ?? false,
      }),
      org_id: orgId,
    };

    if (!body.id) {
      delete (record as any).id;
    }

    const { data, error } = await supabaseAdmin
      .from("data_fields")
      .insert(record)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase POST /data-extraction error", error);
      return NextResponse.json(
        { error: "Failed to create data field", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(dbToCamel(data), { status: 201 });
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
