import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import type { IntentSuggestion } from "./types";
import { HttpError, requireOrgContext } from "../../../lib/auth";

function dbToCamel(row: any): IntentSuggestion {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    messageSnippet: row.message_snippet ?? "",
    suggestedName: row.suggested_name ?? "",
    suggestedDescription: row.suggested_description ?? "",
    confidence: row.confidence ?? 0,
    createdAt: row.created_at,
  };
}

export async function GET(req: Request) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { data, error } = await supabaseAdmin
      .from("intent_suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .eq("org_id", orgId);

    if (error) {
      console.error("Supabase GET /intent-suggestions error", error);
      return NextResponse.json(
        { error: "Failed to load intent suggestions" },
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
    const body = await request.json();

    const record = {
      ticket_id: body.ticketId,
      message_snippet: body.messageSnippet ?? "",
      suggested_name: body.suggestedName ?? "Unknown intent",
      suggested_description: body.suggestedDescription ?? "",
      confidence: body.confidence ?? 0,
      org_id: orgId,
    };

    const { data, error } = await supabaseAdmin
      .from("intent_suggestions")
      .insert(record)
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase POST /intent-suggestions error", error);
      return NextResponse.json(
        { error: "Failed to create intent suggestion", details: error?.message },
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
