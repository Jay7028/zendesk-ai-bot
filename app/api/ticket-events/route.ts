import { NextResponse } from "next/server";
import { defaultOrgId, supabaseAdmin } from "../../../lib/supabase";
import type { TicketEvent } from "./types";

type DbEvent = {
  id: string;
  ticket_id: string;
  event_type: string;
  summary: string;
  detail: string;
  created_at: string;
};

function dbToCamel(row: DbEvent): TicketEvent {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    eventType: row.event_type as TicketEvent["eventType"],
    summary: row.summary,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("ticket_events")
    .select("*")
    .order("created_at", { ascending: false })
    .eq("org_id", defaultOrgId);

  if (error) {
    console.error("Supabase GET /ticket-events error", error);
    return NextResponse.json(
      { error: "Failed to load ticket events" },
      { status: 500 }
    );
  }

  return NextResponse.json((data ?? []).map(dbToCamel));
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    ticketId: string;
    eventType: string;
    summary: string;
    detail?: string;
  };

  const { data, error } = await supabaseAdmin
    .from("ticket_events")
    .insert({
      ticket_id: body.ticketId,
      event_type: body.eventType,
      summary: body.summary,
      detail: body.detail ?? "",
      org_id: defaultOrgId,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase POST /ticket-events error", error);
    return NextResponse.json(
      { error: "Failed to create ticket event", details: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json(dbToCamel(data), { status: 201 });
}
