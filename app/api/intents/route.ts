import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import type { IntentConfig } from "./types";
import { HttpError, requireOrgContext } from "../../../lib/auth";

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

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data, error } = await supabaseAdmin.from("intents").select("*").eq("org_id", orgId);

    if (error) {
      console.error("Supabase GET /intents error", error);
      return NextResponse.json({ error: "Failed to load intents" }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map(dbToCamel));
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /intents unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { orgId } = await requireOrgContext(request);
    const body = (await request.json()) as Partial<IntentConfig>;
    let specialistId = body.specialistId ?? null;

    // If no specialist provided, try to use a Default Specialist if it exists in this org.
    if (!specialistId) {
      const { data: specData } = await supabaseAdmin
        .from("specialists")
        .select("id")
        .eq("name", "Default Specialist")
        .eq("org_id", orgId)
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
      orgId,
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
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /intents unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
