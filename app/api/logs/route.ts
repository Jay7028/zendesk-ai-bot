import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../lib/auth";

type DbLog = {
  id: string;
  created_at: string;
  zendesk_ticket_id: string;
  specialist_id: string;
  specialist_name: string;
  intent_id?: string | null;
  intent_name?: string | null;
  input_summary: string;
  knowledge_sources: string[];
  output_summary: string;
  status: string;
};

type LogPayload = {
  zendeskTicketId: string;
  specialistId: string;
  specialistName: string;
  intentId?: string | null;
  intentName?: string | null;
  inputSummary: string;
  knowledgeSources: string[];
  outputSummary: string;
  status: "success" | "fallback" | "escalated";
};

function dbToCamel(row: DbLog) {
  return {
    id: row.id,
    timestamp: row.created_at,
    zendeskTicketId: row.zendesk_ticket_id,
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    intentId: row.intent_id ?? null,
    intentName: row.intent_name ?? null,
    inputSummary: row.input_summary,
    knowledgeSources: row.knowledge_sources ?? [],
    outputSummary: row.output_summary,
    status: row.status as LogPayload["status"],
  };
}

function camelToDb(body: LogPayload) {
  return {
    zendesk_ticket_id: body.zendeskTicketId,
    specialist_id: body.specialistId,
    specialist_name: body.specialistName,
    intent_id: body.intentId ?? null,
    intent_name: body.intentName ?? null,
    input_summary: body.inputSummary,
    knowledge_sources: body.knowledgeSources ?? [],
    output_summary: body.outputSummary,
    status: body.status,
  };
}

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data, error } = await supabaseAdmin
      .from("logs")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase GET /logs error", error);
      return NextResponse.json(
        { error: "Failed to load logs" },
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
    const body = (await request.json()) as LogPayload;
    const record = { ...camelToDb(body), org_id: orgId };

    const { data, error } = await supabaseAdmin
      .from("logs")
      .insert(record)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase POST /logs error", error);
      return NextResponse.json(
        { error: "Failed to create log", details: error?.message },
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

export async function DELETE(request: Request) {
  try {
    const { orgId } = await requireOrgContext(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("logs")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) {
      console.error("Supabase DELETE /logs error", error);
      return NextResponse.json(
        { error: "Failed to delete log", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("DELETE /logs error", e);
    return NextResponse.json(
      { error: "Failed to delete log", details: String(e) },
      { status: 500 }
    );
  }
}
