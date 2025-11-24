import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

type IntentRow = {
  id: string;
  name: string;
  description: string;
  specialist_id: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message: string = body.message || "";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not set on server" },
        { status: 500 }
      );
    }

    const { data: intentRows, error } = await supabaseAdmin
      .from("intents")
      .select("*");
    if (error) {
      console.error("Supabase load intents error", error);
      return NextResponse.json(
        { error: "Failed to load intents" },
        { status: 500 }
      );
    }
    const intents: IntentRow[] = intentRows ?? [];
    if (!intents.length) {
      return NextResponse.json(
        { error: "No intents configured" },
        { status: 400 }
      );
    }

    const intentListForPrompt = intents
      .map((i) => `- ${i.id}: ${i.name} — ${i.description}`)
      .join("\n");

    const classifyPrompt = [
      {
        role: "system",
        content:
          'You are an intent classifier. Choose the single best intent_id for the user message from the provided list. Respond ONLY with a JSON object like {"intent_id":"<id-or-unknown>"}. If none fit, use "unknown".',
      },
      {
        role: "user",
        content: `User message:\n"""\n${message}\n"""\n\nIntents:\n${intentListForPrompt}\n\nReturn a JSON object with intent_id.`,
      },
    ];

    const classifyRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: classifyPrompt,
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      }
    );

    if (!classifyRes.ok) {
      const text = await classifyRes.text();
      console.error("OpenAI classify error (intent tester):", text);
      return NextResponse.json(
        { error: "OpenAI intent classify error", details: text },
        { status: 500 }
      );
    }

    const classifyJson = await classifyRes.json();
    const intentId =
      (() => {
        try {
          const parsed = JSON.parse(
            classifyJson.choices?.[0]?.message?.content || "{}"
          );
          return parsed.intent_id as string;
        } catch {
          return null;
        }
      })() || "unknown";

    const matchedIntent = intents.find((i) => i.id === intentId) ?? null;

    return NextResponse.json({
      intentId,
      intentName: matchedIntent?.name ?? null,
      raw: classifyJson.choices?.[0]?.message?.content ?? null,
    });
  } catch (err: any) {
    console.error("Error in /api/intents/classify:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
