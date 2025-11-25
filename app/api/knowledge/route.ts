import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

async function embed(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set on server");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Embedding error: ${txt}`);
  }
  const json = await res.json();
  const vector = json?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) throw new Error("Embedding response missing vector");
  return vector;
}

export async function GET(req: NextRequest) {
  const specialistId = req.nextUrl.searchParams.get("specialistId");
  const intentId = req.nextUrl.searchParams.get("intentId");
  const query = supabaseAdmin.from("knowledge_chunks").select("*").order("created_at", { ascending: false });
  const { data, error } =
    specialistId || intentId
      ? await query.match({
          ...(specialistId ? { specialist_id: specialistId } : {}),
          ...(intentId ? { intent_id: intentId } : {}),
        })
      : await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const body = await req.json();
    const title = (body.title || "").toString().trim();
    const content = (body.content || "").toString().trim();
    const intentId = body.intentId ? body.intentId.toString() : null;
    const specialistId = body.specialistId ? body.specialistId.toString() : null;
    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }
    const embedding = await embed(content);
    const { data, error } = await supabaseAdmin
      .from("knowledge_chunks")
      .update({
        title,
        content,
        intent_id: intentId,
        specialist_id: specialistId,
        embedding,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, chunk: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabaseAdmin.from("knowledge_chunks").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete" }, { status: 500 });
  }
}
