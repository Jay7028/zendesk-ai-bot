import { defaultOrgId, supabaseAdmin } from "./supabase";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const EMBEDDING_MODEL = "text-embedding-3-small";

type ChunkMatch = {
  id: string;
  title: string;
  content: string;
  specialist_id: string | null;
  intent_id: string | null;
  similarity: number | null;
};

async function embed(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set on server");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
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

async function matchChunks(query: string, intentId?: string, specialistId?: string, matchCount = 5) {
  try {
    const embedding = await embed(query);
    const { data, error } = await supabaseAdmin.rpc("match_knowledge_chunks", {
      query_embedding: embedding,
      match_count: matchCount,
      intent_id: intentId ?? null,
      specialist_id: specialistId ?? null,
      p_org_id: defaultOrgId,
    });
    if (error) throw error;
    return (data || []) as ChunkMatch[];
  } catch (e) {
    console.error("matchChunks error", e);
    return [];
  }
}

async function summarizeChunks(chunks: ChunkMatch[], query: string) {
  if (!chunks.length) return { summary: "", used: [] as ChunkMatch[] };
  const trimmed = chunks.slice(0, 5);
  if (!OPENAI_API_KEY) {
    return {
      summary: trimmed.map((c) => `- ${c.title || "rule"}: ${c.content}`).join("\n"),
      used: trimmed,
    };
  }
  const prompt = [
    {
      role: "system",
      content:
        "Summarize the provided policy snippets into 3-6 concise bullet rules relevant to the user query. Keep it short; do not copy long text; preserve critical conditions (time windows, actions).",
    },
    {
      role: "user",
      content: `User query: ${query}\n\nSnippets:\n${trimmed
        .map((c, i) => `${i + 1}. ${c.title || "snippet"}: ${c.content}`)
        .join("\n")}\n\nReturn bullet rules.`,
    },
  ];
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: prompt,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Summarize error: ${txt}`);
    }
    const json = await res.json();
    const summary = json?.choices?.[0]?.message?.content?.trim() || "";
    return { summary, used: trimmed };
  } catch (e) {
    console.error("summarizeChunks error", e);
    return {
      summary: trimmed.map((c) => `- ${c.title || "rule"}: ${c.content}`).join("\n"),
      used: trimmed,
    };
  }
}

export async function buildKnowledgeContext(opts: {
  query: string;
  intentId?: string;
  specialistId?: string;
}) {
  const matches = await matchChunks(opts.query, opts.intentId, opts.specialistId);
  const { summary, used } = await summarizeChunks(matches, opts.query);
  return {
    summary,
    used,
  };
}

export type KnowledgeContext = Awaited<ReturnType<typeof buildKnowledgeContext>>;
