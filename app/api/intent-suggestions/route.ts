import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import type { IntentSuggestion } from "./types";

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

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("intent_suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase GET /intent-suggestions error", error);
    return NextResponse.json(
      { error: "Failed to load intent suggestions" },
      { status: 500 }
    );
  }

  return NextResponse.json((data ?? []).map(dbToCamel));
}

export async function POST(request: Request) {
  const body = await request.json();

  const record = {
    ticket_id: body.ticketId,
    message_snippet: body.messageSnippet ?? "",
    suggested_name: body.suggestedName ?? "Unknown intent",
    suggested_description: body.suggestedDescription ?? "",
    confidence: body.confidence ?? 0,
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
}
