import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import type { SpecialistConfig } from "../data";

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

// Note: params is now a Promise, so we await it inside the handler.

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("specialists")
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
  const body = (await request.json()) as Partial<SpecialistConfig>;
  const dbRecord = camelToDb({ ...body, id });

  const { data, error } = await supabaseAdmin
    .from("specialists")
    .update(dbRecord)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase PUT /specialists/:id error", error);
    return NextResponse.json(
      { error: "Failed to save specialist", details: error?.message },
      { status: 500 }
    );
  }

  await logAdminEvent(`Updated specialist "${data.name}"`, `id: ${data.id}`);
  return NextResponse.json(dbToCamel(data));
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { error } = await supabaseAdmin
    .from("specialists")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Supabase DELETE /specialists/:id error", error);
    return NextResponse.json(
      { error: "Failed to delete specialist", details: error.message },
      { status: 500 }
    );
  }

  await logAdminEvent(`Deleted specialist "${id}"`);
  return NextResponse.json({ success: true });
}
