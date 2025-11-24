import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

type DbLog = {
  id: string;
  created_at: string;
  zendesk_ticket_id: string;
  specialist_id: string;
  specialist_name: string;
  input_summary: string;
  knowledge_sources: string[];
  output_summary: string;
  status: string;
};

type LogPayload = {
  zendeskTicketId: string;
  specialistId: string;
  specialistName: string;
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
    input_summary: body.inputSummary,
    knowledge_sources: body.knowledgeSources ?? [],
    output_summary: body.outputSummary,
    status: body.status,
  };
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase GET /logs error", error);
    return NextResponse.json(
      { error: "Failed to load logs" },
      { status: 500 }
    );
  }

  return NextResponse.json((data ?? []).map(dbToCamel));
}

export async function POST(request: Request) {
  const body = (await request.json()) as LogPayload;
  const record = camelToDb(body);

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
}
