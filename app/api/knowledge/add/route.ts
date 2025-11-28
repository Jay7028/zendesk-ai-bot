import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../../lib/auth";

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

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
    const body = await req.json();
    const title = (body.title || "").toString().trim();
    const content = (body.content || "").toString().trim();
    const intentId = body.intentId ? body.intentId.toString() : null;
    const specialistId = body.specialistId ? body.specialistId.toString() : null;

    if (!title || !content) {
      return NextResponse.json({ error: "title and content are required" }, { status: 400 });
    }

    const embedding = await embed(content);
    const documentTitle = (body.documentTitle || "").toString().trim() || null;
    const documentUrl = (body.documentUrl || "").toString().trim() || null;
    const documentType = (body.documentType || "").toString().trim() || null;
    const documentSummary = (body.documentSummary || "").toString().trim() || null;

    const { data, error } = await supabaseAdmin
      .from("knowledge_chunks")
      .insert({
        title,
        content,
        intent_id: intentId,
        specialist_id: specialistId,
        org_id: orgId,
        embedding,
        document_title: documentTitle,
        document_url: documentUrl,
        document_type: documentType,
        document_summary: documentSummary,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, chunk: data });
  } catch (e: any) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("knowledge/add error", e);
    return NextResponse.json({ error: e?.message || "Failed to add knowledge" }, { status: 500 });
  }
}
