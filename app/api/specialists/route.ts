import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import type { SpecialistConfig } from "./data";

function dbToCamel(row: any): SpecialistConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    docsCount: row.docs_count ?? 0,
    rulesCount: row.rules_count ?? 0,
    dataExtractionPrompt: row.data_extraction_prompt ?? "",
    requiredFields: row.required_fields ?? [],
    knowledgeBaseNotes: row.knowledge_base_notes ?? "",
    escalationRules: row.escalation_rules ?? "",
    personalityNotes: row.personality_notes ?? "",
  };
}

function camelToDb(body: Partial<SpecialistConfig>) {
  return {
    id: body.id,
    name: body.name,
    description: body.description,
    active: body.active,
    docs_count: body.docsCount ?? 0,
    rules_count: body.rulesCount ?? 0,
    data_extraction_prompt: body.dataExtractionPrompt ?? "",
    required_fields: body.requiredFields ?? [],
    knowledge_base_notes: body.knowledgeBaseNotes ?? "",
    escalation_rules: body.escalationRules ?? "",
    personality_notes: body.personalityNotes ?? "",
  };
}

async function logAdminEvent(summary: string, detail?: string) {
  try {
    await supabaseAdmin.from("ticket_events").insert({
      ticket_id: "admin",
      event_type: "admin_change",
      summary,
      detail: detail ?? "",
    });
  } catch (e) {
    console.error("Failed to log admin event", e);
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from("specialists").select("*");

  if (error) {
    console.error("Supabase GET /specialists error", error);
    return NextResponse.json(
      { error: "Failed to load specialists" },
      { status: 500 }
    );
  }

  return NextResponse.json((data ?? []).map(dbToCamel));
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<SpecialistConfig>;
  const dbRecord = camelToDb({
    // supply safe defaults for NOT NULL columns
    name: body.name ?? "New Specialist",
    description: body.description ?? "",
    active: body.active ?? false,
    docsCount: body.docsCount ?? 0,
    rulesCount: body.rulesCount ?? 0,
    dataExtractionPrompt: body.dataExtractionPrompt ?? "",
    requiredFields: body.requiredFields ?? [],
    knowledgeBaseNotes: body.knowledgeBaseNotes ?? "",
    escalationRules: body.escalationRules ?? "",
    personalityNotes: body.personalityNotes ?? "",
  });

  // Let Supabase generate the id if none provided
  if (!body.id) {
    delete (dbRecord as any).id;
  }

  const { data, error } = await supabaseAdmin
    .from("specialists")
    .insert(dbRecord)
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase POST /specialists error", error);
    return NextResponse.json(
      { error: "Failed to create specialist", details: error?.message },
      { status: 500 }
    );
  }

  await logAdminEvent(`Created specialist "${data.name}"`, `id: ${data.id}`);
  return NextResponse.json(dbToCamel(data), { status: 201 });
}
