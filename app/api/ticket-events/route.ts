import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import type { TicketEvent } from "./types";
import { HttpError, requireOrgContext } from "../../../lib/auth";

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

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data, error } = await supabaseAdmin
      .from("ticket_events")
      .select("*")
      .order("created_at", { ascending: false })
      .eq("org_id", orgId);

    if (error) {
      console.error("Supabase GET /ticket-events error", error);
      return NextResponse.json(
        { error: "Failed to load ticket events" },
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
        org_id: orgId,
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
    const all = searchParams.get("all") === "true";
    const ticketId = searchParams.get("ticketId");
    const id = searchParams.get("id");

    let query = supabaseAdmin.from("ticket_events").delete().eq("org_id", orgId);
    if (all) {
      // delete entire org events
    } else if (ticketId) {
      query = query.eq("ticket_id", ticketId);
    } else if (id) {
      query = query.eq("id", id);
    } else {
      return NextResponse.json(
        { error: "id, ticketId, or all=true required" },
        { status: 400 }
      );
    }

    const { error } = await query;
    if (error) {
      console.error("Supabase DELETE /ticket-events error", error);
      return NextResponse.json(
        { error: "Failed to delete ticket events", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /ticket-events error", err);
    return NextResponse.json(
      { error: "Failed to delete ticket events", details: String(err) },
      { status: 500 }
    );
  }
}
