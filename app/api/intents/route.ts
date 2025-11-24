import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import type { IntentConfig } from "./types";

function dbToCamel(row: any): IntentConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    specialistId: row.specialist_id ? row.specialist_id : null,
  };
}

function camelToDb(body: Partial<IntentConfig>) {
  return {
    id: body.id,
    name: body.name,
    description: body.description ?? "",
    // Store empty string when unset (matches schema that may be non-null).
    specialist_id: body.specialistId ?? "",
  };
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from("intents").select("*");

  if (error) {
    console.error("Supabase GET /intents error", error);
    return NextResponse.json({ error: "Failed to load intents" }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(dbToCamel));
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<IntentConfig>;
  const dbRecord = camelToDb({
    name: body.name ?? "New Intent",
    description: body.description ?? "",
    specialistId: body.specialistId ?? "",
  });

  if (!body.id) {
    delete (dbRecord as any).id;
  }

  const { data, error } = await supabaseAdmin
    .from("intents")
    .insert(dbRecord)
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase POST /intents error", error);
    return NextResponse.json(
      { error: "Failed to create intent", details: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json(dbToCamel(data), { status: 201 });
}
