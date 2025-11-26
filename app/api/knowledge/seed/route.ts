import { NextRequest, NextResponse } from "next/server";
import { defaultOrgId, supabaseAdmin } from "../../../../lib/supabase";

const SEEDS = [
  {
    title: "Collection point uncollected >3 days",
    content:
      "If a parcel sits at a collection point for more than 3 days without pickup, it is returned to sender. Inform the customer it is in return transit; advise to wait for processing before reship/refund.",
  },
  {
    title: "Disputed delivery - signature present",
    content:
      "If courier shows delivered with signature: confirm address, provide proof of delivery, and suggest checking with household/neighbours. Escalate only if customer confirms no receipt after these checks.",
  },
  {
    title: "Delayed in transit - still moving",
    content:
      "If tracking shows in-transit scans within last 72 hours: reassure, provide latest scan, and set expectation for next update within 24-48 hours. Do not promise exact ETA unless carrier provides one.",
  },
  {
    title: "Lost in transit - no scans >7 days",
    content:
      "If no tracking updates for 7+ days and courier confirms stalled: treat as lost. Apologize, offer replacement or refund per policy, and file a loss claim with carrier.",
  },
  {
    title: "Return to sender initiated",
    content:
      "If tracking shows RTS/return to sender: advise customer it is heading back to warehouse. Offer to reship on arrival or refund per policy once checked in.",
  },
];

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const SEED_TOKEN = process.env.SEED_TOKEN || "";

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
  if (!SEED_TOKEN) {
    return NextResponse.json(
      { error: "SEED_TOKEN not set on server; seeding disabled" },
      { status: 500 }
    );
  }
  const token = req.headers.get("x-seed-token") || req.headers.get("authorization");
  const normalized = token?.replace(/^Bearer\s+/i, "").trim();
  if (!normalized || normalized !== SEED_TOKEN) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Token mismatch or missing. Ensure SEED_TOKEN is set in env and header matches.",
        receivedLength: normalized ? normalized.length : 0,
        expectedSet: !!SEED_TOKEN,
      },
      { status: 401 }
    );
  }
  try {
    const rows = [];
    for (const seed of SEEDS) {
      const embedding = await embed(seed.content);
      rows.push({
        title: seed.title,
        content: seed.content,
        intent_id: null,
        specialist_id: null,
        org_id: defaultOrgId,
        embedding,
      });
    }
    const { error } = await supabaseAdmin.from("knowledge_chunks").insert(rows);
    if (error) {
      throw new Error(error.message);
    }
    return NextResponse.json({ inserted: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Seed failed" }, { status: 500 });
  }
}
