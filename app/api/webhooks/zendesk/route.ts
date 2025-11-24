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
  specialist_id: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const ticketId = body.ticket_id ?? body.id;
    const latestComment =
      body.latest_comment ??
      body.comment ??
      body.description ??
      "No customer message provided.";
    const requesterEmail =
      body.requester_email ?? body.requester?.email ?? "unknown@example.com";

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticket_id is required in payload" },
        { status: 400 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const zendeskSubdomain = process.env.ZENDESK_SUBDOMAIN;
    const zendeskEmail = process.env.ZENDESK_EMAIL;
    const zendeskToken = process.env.ZENDESK_API_TOKEN;

    if (!openaiKey || !zendeskSubdomain || !zendeskEmail || !zendeskToken) {
      console.error("Missing Zendesk/OpenAI env vars");
      return NextResponse.json(
        { error: "Server not fully configured (env vars missing)" },
        { status: 500 }
      );
    }

    // Load intents and specialists
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

    const intentListForPrompt = intents
      .map((i) => `- ${i.id}: ${i.name} — ${i.description}`)
      .join("\n");

    const classifyPrompt = [
      {
        role: "system",
        content:
          "You are an intent classifier. Choose the single best intent_id for the user message from the provided list. If none fit, return \"unknown\".",
      },
      {
        role: "user",
        content: `User message:\n"""\n${latestComment}\n"""\n\nIntents:\n${intentListForPrompt}`,
      },
    ];

    const classifyRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
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
      console.error("OpenAI classify error (webhook):", text);
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
      })() || intents[0]?.id;

    const matchedIntent = intents.find((i) => i.id === intentId) ?? intents[0] ?? null;
    const matchedSpecialist =
      specialists.find((s) => s.id === matchedIntent?.specialist_id) ?? null;

    // If no specialist mapped, tag for handover and exit early
    if (!matchedSpecialist) {
      const authString = Buffer.from(
        `${zendeskEmail}/token:${zendeskToken}`
      ).toString("base64");

      const zendeskUrl = `https://${zendeskSubdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`;

      await fetch(zendeskUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify({
          ticket: {
            additional_tags: ["bot-handover"],
            comment: {
              body: "No specialist matched this intent. Routing to a human.",
              public: true,
            },
          },
        }),
      });

      return NextResponse.json({
        status: "handover",
        ticketId,
        intentId: matchedIntent?.id ?? null,
        specialistId: null,
      });
    }

    const replyPrompt = [
      {
        role: "system",
        content: `You are a professional customer support email agent.\nSpecialist: ${matchedSpecialist.name}\nDescription: ${matchedSpecialist.description}\nKnowledge: ${matchedSpecialist.knowledge_base_notes}\nEscalation rules: ${matchedSpecialist.escalation_rules}\nPersonality: ${matchedSpecialist.personality_notes}\nRequired fields: ${matchedSpecialist.required_fields?.join(", ") || "none"}`,
      },
      {
        role: "user",
        content: `Ticket ID: ${ticketId}\nCustomer email: ${requesterEmail}\n\nCustomer message:\n"""\n${latestComment}\n"""\n\nWrite a clear, polite email reply in a professional tone. If information is missing, ask for the needed details instead of guessing.`,
      },
    ];

    // 1) Get AI reply
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: replyPrompt,
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error("OpenAI error (webhook):", text);
      return NextResponse.json(
        { error: "OpenAI API error", details: text },
        { status: 500 }
      );
    }

    const openaiData = await openaiRes.json();
    const aiReply: string =
      openaiData.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I could not generate a reply.";

    // 2) Post reply back to Zendesk as a public comment
    const authString = Buffer.from(
      `${zendeskEmail}/token:${zendeskToken}`
    ).toString("base64");

    const zendeskUrl = `https://${zendeskSubdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`;

    const zendeskRes = await fetch(zendeskUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        ticket: {
          comment: {
            body: aiReply,
            public: true,
          },
        },
      }),
    });

    if (!zendeskRes.ok) {
      const text = await zendeskRes.text();
      console.error("Zendesk API error:", text);
      return NextResponse.json(
        { error: "Zendesk API error", details: text },
        { status: 500 }
      );
    }

    // 3) Log this run to /api/logs via HTTP (same as the debug button)
    try {
      const origin = req.nextUrl.origin;
      const logRes = await fetch(new URL("/api/logs", origin), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zendeskTicketId: ticketId.toString(),
          specialistId: matchedSpecialist.id,
          specialistName: matchedSpecialist.name,
          inputSummary: String(latestComment).slice(0, 200),
          knowledgeSources: [],
          outputSummary: aiReply.slice(0, 200),
          status: "success",
        }),
      });

      if (!logRes.ok) {
        console.error(
          "Log POST failed:",
          logRes.status,
          await logRes.text()
        );
      }
    } catch (e) {
      console.error("Failed to log run", e);
    }

    return NextResponse.json({
      status: "ok",
      ticketId,
      postedToZendesk: true,
      intentId: matchedIntent?.id ?? null,
      specialistId: matchedSpecialist.id,
    });
  } catch (err: any) {
    console.error("Error in /api/webhooks/zendesk:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
