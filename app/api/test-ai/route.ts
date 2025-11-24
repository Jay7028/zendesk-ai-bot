import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

type SpecialistRow = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  docs_count: number;
  rules_count: number;
  data_extraction_prompt: string;
  required_fields: string[];
  knowledge_base_notes: string;
  escalation_rules: string;
  personality_notes: string;
};

type IntentRow = {
  id: string;
  name: string;
  description: string;
  specialist_id: string | null;
};

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: Message[] = Array.isArray(body.messages)
      ? body.messages
      : body.message
      ? [{ role: "user", content: body.message }]
      : [];

    const latestUser = [...messages].reverse().find((m) => m.role === "user");
    const userMessage = latestUser?.content?.trim() || "No message provided";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not set on server" },
        { status: 500 }
      );
    }

    const [{ data: intentRows, error: intentsError }, { data: specRows, error: specsError }] =
      await Promise.all([
        supabaseAdmin.from("intents").select("*"),
        supabaseAdmin.from("specialists").select("*"),
      ]);

    if (intentsError || specsError) {
      console.error("Supabase load error", intentsError || specsError);
      return NextResponse.json(
        { error: "Failed to load intents/specialists" },
        { status: 500 }
      );
    }

    const intents: IntentRow[] = intentRows ?? [];
    const specialists: SpecialistRow[] = specRows ?? [];

    const actions: string[] = [];

    const intentListForPrompt = intents
      .map((i) => `- ${i.id}: ${i.name} — ${i.description}`)
      .join("\n");

    const classifyPrompt = [
      {
        role: "system",
        content:
          'You are an intent classifier. Choose the single best intent_id for the user message from the provided list. Respond ONLY with a JSON object like {"intent_id":"<id-or-unknown>","confidence":0.0-1.0}. If none fit or confidence is low, use "unknown" and confidence 0.',
      },
      {
        role: "user",
        content: `User message:\n"""\n${userMessage}\n"""\n\nIntents:\n${intentListForPrompt}\n\nReturn a JSON object with intent_id and confidence.`,
      },
    ];

    const classifyRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
    });

    if (!classifyRes.ok) {
      const text = await classifyRes.text();
      console.error("OpenAI classify error:", text);
      return NextResponse.json(
        { error: "OpenAI intent classify error", details: text },
        { status: 500 }
      );
    }

    const classifyJson = await classifyRes.json();
    const parsedClassify =
      (() => {
        try {
          return JSON.parse(
            classifyJson.choices?.[0]?.message?.content || "{}"
          );
        } catch {
          return {};
        }
      })() as { intent_id?: string; confidence?: number };

    const intentId = parsedClassify.intent_id || intents[0]?.id;
    const confidence =
      typeof parsedClassify.confidence === "number"
        ? parsedClassify.confidence
        : 0;
    const CONFIDENCE_THRESHOLD = 0.6;

    const matchedIntent =
      confidence >= CONFIDENCE_THRESHOLD
        ? intents.find((i) => i.id === intentId) ?? intents[0] ?? null
        : null;
    const matchedSpecialist =
      matchedIntent && confidence >= CONFIDENCE_THRESHOLD
        ? specialists.find((s) => s.id === matchedIntent.specialist_id) ?? null
        : null;

    actions.push(
      `Classified intent: ${matchedIntent?.name ?? "unknown"} (confidence ${confidence.toFixed(
        2
      )})`
    );
    if (matchedSpecialist) {
      actions.push(`Routed to specialist: ${matchedSpecialist.name}`);
    } else {
      actions.push("No specialist matched (unknown or low confidence)");
    }

    const replyMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      {
        role: "system",
        content: matchedSpecialist
          ? `You are a helpful customer service email assistant.\nSpecialist: ${matchedSpecialist.name}\nDescription: ${matchedSpecialist.description}\nKnowledge: ${matchedSpecialist.knowledge_base_notes}\nEscalation rules: ${matchedSpecialist.escalation_rules}\nPersonality: ${matchedSpecialist.personality_notes}\nRequired fields: ${matchedSpecialist.required_fields?.join(", ") || "none"}`
          : "You are a helpful customer service email assistant.",
      },
    ];

    messages.forEach((m) => {
      replyMessages.push({ role: m.role, content: m.content });
    });
    if (replyMessages[replyMessages.length - 1]?.role !== "user") {
      replyMessages.push({ role: "user", content: userMessage });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: replyMessages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI API error:", text);
      return NextResponse.json(
        { error: "OpenAI API error", details: text },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "";

    actions.push("Generated reply");

    return NextResponse.json({
      reply,
      intentId: matchedIntent?.id ?? null,
      intentName: matchedIntent?.name ?? null,
      specialistId: matchedSpecialist?.id ?? null,
      specialistName: matchedSpecialist?.name ?? null,
      actions,
    });
  } catch (err: any) {
    console.error("Error in /api/test-ai:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
