import { NextResponse } from "next/server";
import { defaultOrgId, supabaseAdmin } from "../../../lib/supabase";
import type { IntentConfig } from "./types";

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

export async function GET() {
  const { data, error } = await supabaseAdmin.from("intents").select("*").eq("org_id", defaultOrgId);

  if (error) {
    console.error("Supabase GET /intents error", error);
    return NextResponse.json({ error: "Failed to load intents" }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(dbToCamel));
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<IntentConfig>;
  let specialistId = body.specialistId ?? null;

  // If no specialist provided, try to use a Default Specialist if it exists.
  if (!specialistId) {
    const { data: specData } = await supabaseAdmin
      .from("specialists")
      .select("id")
      .eq("name", "Default Specialist")
      .eq("org_id", defaultOrgId)
      .limit(1)
      .single();
    if (specData?.id) {
      specialistId = specData.id;
    }
  }

  const dbRecord = camelToDb({
    name: body.name ?? "New Intent",
    description: body.description ?? "",
    specialistId,
    orgId: defaultOrgId,
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
