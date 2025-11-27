import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { requireOrgContext } from "../../../lib/auth";
import type { SpecialistConfig } from "./data";

let hasPublicReplyColumnCache: boolean | null = null;

async function ensurePublicReplyColumn() {
  if (hasPublicReplyColumnCache !== null) return hasPublicReplyColumnCache;
  try {
    await supabaseAdmin.from("specialists").select("public_reply").limit(1).maybeSingle();
    hasPublicReplyColumnCache = true;
  } catch (err: any) {
    if (err?.code === "42703") {
      hasPublicReplyColumnCache = false;
    } else {
      throw err;
    }
  }
  return hasPublicReplyColumnCache;
}

function dbToCamel(row: any, hasPublicReplyColumn: boolean): SpecialistConfig {
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
    publicReply: hasPublicReplyColumn ? (row.public_reply ?? true) : true,
  };
}

function camelToDb(body: Partial<SpecialistConfig>, hasPublicReplyColumn: boolean) {
  const record: any = {
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
  if (hasPublicReplyColumn && typeof body.publicReply === "boolean") {
    record.public_reply = body.publicReply;
  }
  return record;
}

async function logAdminEvent(orgId: string, summary: string, detail?: string) {
  try {
    await supabaseAdmin.from("ticket_events").insert({
      ticket_id: "admin",
      event_type: "admin_change",
      summary,
      detail: detail ?? "",
      org_id: orgId,
    });
  } catch (e) {
    console.error("Failed to log admin event", e);
  }
}

export async function GET(request: Request) {
  const { orgId } = await requireOrgContext(request);
  const hasPublicReplyColumn = await ensurePublicReplyColumn();
  const { data, error } = await supabaseAdmin
    .from("specialists")
    .select("*")
    .eq("org_id", orgId);

  if (error) {
    console.error("Supabase GET /specialists error", error);
    return NextResponse.json(
      { error: "Failed to load specialists" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    (data ?? []).map((row) => dbToCamel(row, hasPublicReplyColumn))
  );
}

export async function POST(request: Request) {
  const { orgId } = await requireOrgContext(request);
  const body = (await request.json()) as Partial<SpecialistConfig>;
  const hasPublicReplyColumn = await ensurePublicReplyColumn();
  const payload: Partial<SpecialistConfig> = {
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
    publicReply:
      typeof body.publicReply === "boolean"
        ? body.publicReply
        : body.id
        ? undefined
        : true,
  };
  const dbRecord = {
    ...camelToDb(payload, hasPublicReplyColumn),
    org_id: orgId,
  };

  // Update if id is provided, otherwise insert new
  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from("specialists")
      .update(dbRecord)
      .eq("id", body.id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase POST /specialists update error", error);
      return NextResponse.json(
        { error: "Failed to update specialist", details: error?.message },
        { status: 500 }
      );
    }

    await logAdminEvent(orgId, `Updated specialist "${data.name}"`, `id: ${data.id}`);
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

    await logAdminEvent(orgId, `Created specialist "${data.name}"`, `id: ${data.id}`);
    return NextResponse.json(dbToCamel(data), { status: 201 });
  }
}

export async function DELETE(request: Request) {
  const { orgId } = await requireOrgContext(request);
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
    .eq("org_id", orgId);

  if (error) {
    console.error("Supabase DELETE /specialists error", error);
    return NextResponse.json(
      { error: "Failed to delete specialist", details: error.message },
      { status: 500 }
    );
  }

  await logAdminEvent(orgId, `Deleted specialist`, `id: ${id}`);
  return NextResponse.json({ success: true }, { status: 200 });
}
