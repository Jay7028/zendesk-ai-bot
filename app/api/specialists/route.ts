import { NextResponse } from "next/server";
import { defaultOrgId, supabaseAdmin } from "../../../lib/supabase";
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
      org_id: defaultOrgId,
    });
  } catch (e) {
    console.error("Failed to log admin event", e);
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("specialists")
    .select("*")
    .eq("org_id", defaultOrgId);

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
  const dbRecord = {
    ...camelToDb({
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
    }),
    org_id: defaultOrgId,
  };

  // Update if id is provided, otherwise insert new
  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from("specialists")
      .update(dbRecord)
      .eq("id", body.id)
      .eq("org_id", defaultOrgId)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase POST /specialists update error", error);
      return NextResponse.json(
        { error: "Failed to update specialist", details: error?.message },
        { status: 500 }
      );
    }

    await logAdminEvent(`Updated specialist "${data.name}"`, `id: ${data.id}`);
    return NextResponse.json(dbToCamel(data), { status: 200 });
  } else {
    delete (dbRecord as any).id; // let Supabase generate
    const { data, error } = await supabaseAdmin
      .from("specialists")
      .insert(dbRecord)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase POST /specialists insert error", error);
      return NextResponse.json(
        { error: "Failed to create specialist", details: error?.message },
        { status: 500 }
      );
    }

    await logAdminEvent(`Created specialist "${data.name}"`, `id: ${data.id}`);
    return NextResponse.json(dbToCamel(data), { status: 201 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const idFromQuery = url.searchParams.get("id");
  const body = request.headers.get("content-length")
    ? ((await request.json()) as { id?: string })
    : {};
  const id = idFromQuery || body.id;
  if (!id) {
    return NextResponse.json(
      { error: "id is required to delete specialist" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("specialists")
    .delete()
    .eq("id", id)
    .eq("org_id", defaultOrgId);

  if (error) {
    console.error("Supabase DELETE /specialists error", error);
    return NextResponse.json(
      { error: "Failed to delete specialist", details: error.message },
      { status: 500 }
    );
  }

  await logAdminEvent(`Deleted specialist`, `id: ${id}`);
  return NextResponse.json({ success: true }, { status: 200 });
}
