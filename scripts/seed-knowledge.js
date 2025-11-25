// Simple seeder for knowledge_chunks using OpenAI embeddings and Supabase.
// Run with: node scripts/seed-knowledge.js
// Requires env: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL

const { createClient } = require("@supabase/supabase-js");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env. Need OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

async function embed(text) {
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
    throw new Error(`Embedding failed: ${txt}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

async function run() {
  const rows = [];
  for (const seed of SEEDS) {
    const embedding = await embed(seed.content);
    rows.push({
      title: seed.title,
      content: seed.content,
      intent_id: null,
      specialist_id: null,
      embedding,
    });
    console.log("Embedded:", seed.title);
  }

  const { error } = await supabase.from("knowledge_chunks").insert(rows);
  if (error) {
    console.error("Insert error:", error);
    process.exit(1);
  }
  console.log(`Inserted ${rows.length} knowledge chunks`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
