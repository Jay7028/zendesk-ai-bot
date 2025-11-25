import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { trackOnce, summarizeParcel, type ParcelSummary } from "../../../../lib/parcelsapp";
import { buildKnowledgeContext } from "../../../../lib/knowledge";

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

async function tagHandover(
  ticketId: string | number,
  zendeskSubdomain: string,
  zendeskEmail: string,
  zendeskToken: string
) {
  const authString = Buffer.from(
    `${zendeskEmail}/token:${zendeskToken}`
  ).toString("base64");

  const zendeskUrl = `https://${zendeskSubdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`;

  const handoverRes = await fetch(zendeskUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify({
      ticket: {
        tags: ["bot-handover"],
      },
    }),
  });

  return { handoverRes, zendeskUrl };
}

async function logRun(
  origin: string,
  payload: {
    ticketId: string | number;
    specialistId: string | null;
    specialistName: string | null;
    intentId: string | null;
    intentName: string | null;
    inputSummary: string;
    outputSummary: string;
    status: "success" | "fallback" | "escalated";
  }
) {
  try {
    await fetch(new URL("/api/logs", origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zendeskTicketId: payload.ticketId.toString(),
        specialistId: payload.specialistId ?? "unknown",
        specialistName: payload.specialistName ?? "unknown",
        intentId: payload.intentId,
        intentName: payload.intentName,
        inputSummary: payload.inputSummary,
        knowledgeSources: [],
        outputSummary: payload.outputSummary,
        status: payload.status,
      }),
    });
  } catch (e) {
    console.error("Failed to log run", e);
  }
}

async function logTicketEvent(
  origin: string,
  payload: {
    ticketId: string | number;
    eventType: string;
    summary: string;
    detail?: string;
  }
) {
  try {
    await fetch(new URL("/api/ticket-events", origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId: payload.ticketId.toString(),
        eventType: payload.eventType,
        summary: payload.summary,
        detail: payload.detail ?? "",
      }),
    });
  } catch (e) {
    console.error("Failed to log ticket event", e);
  }
}

async function saveIntentSuggestion(
  origin: string,
  message: string,
  ticketId: string | number,
  confidence: number,
  openaiKey: string
) {
  let suggestedName = "Unknown intent";
  let suggestedDescription = "";

  try {
    const suggestRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You propose an intent name and one-line description for a customer message. Keep it concise.",
          },
          {
            role: "user",
            content: `Message:\n"""\n${message}\n"""\nReturn JSON: {"name":"<intent-name>","description":"<one line>"}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (suggestRes.ok) {
      const json = await suggestRes.json();
      const parsed =
        (() => {
          try {
            return JSON.parse(json.choices?.[0]?.message?.content || "{}");
          } catch {
            return {};
          }
        })() as { name?: string; description?: string };
      suggestedName = parsed.name || suggestedName;
      suggestedDescription = parsed.description || suggestedDescription;
    } else {
      const text = await suggestRes.text();
      console.error("Intent suggestion error:", text);
    }
  } catch (e) {
    console.error("Intent suggestion exception:", e);
  }

  await fetch(new URL("/api/intent-suggestions", origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketId: ticketId.toString(),
      messageSnippet: String(message).slice(0, 500),
      suggestedName,
      suggestedDescription,
      confidence,
    }),
  });
}

function extractTrackingCandidates(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\b[A-Z0-9]{10,35}\b/gi) || [];
  const cleaned = matches
    .map((m) => m.replace(/[^A-Z0-9]/gi, "").toUpperCase())
    .filter((m) => m.length >= 10 && m.length <= 35);
  return Array.from(new Set(cleaned));
}

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
    const trackingCandidates = extractTrackingCandidates(latestComment);
    let trackingSummary: ParcelSummary | null = null;
    let trackingContextText = "";

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
    const origin = req.nextUrl.origin;

    if (!intents.length || !specialists.length) {
      await logRun(origin, {
        ticketId,
        specialistId: null,
        specialistName: null,
        intentId: null,
        intentName: null,
        inputSummary: String(latestComment).slice(0, 200),
        outputSummary: "No intents or specialists configured.",
        status: "fallback",
      });
      await logTicketEvent(origin, {
        ticketId,
        eventType: "error",
        summary: "No intents/specialists configured",
        detail: "Nothing to route against.",
      });
      return NextResponse.json(
        { error: "No intents or specialists configured" },
        { status: 500 }
      );
    }

    const intentListForPrompt = intents
      .map((i) => `- ${i.id}: ${i.name} — ${i.description}`)
      .join("\n");

    const classifyPrompt = [
      {
        role: "system",
        content:
          'You are an intent classifier. Choose the single best intent_id for the user message from the provided list. Respond ONLY with a JSON object like {"intent_id":"<id-or-unknown>","confidence":0.0-1.0}. If the message does not clearly map to one intent or confidence is low, set intent_id to "unknown" and confidence to 0.',
      },
      {
        role: "user",
        content: `User message:\n"""\n${latestComment}\n"""\n\nIntents:\n${intentListForPrompt}\n\nReturn a JSON object with intent_id and confidence.`,
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
      await logRun(origin, {
        ticketId,
        specialistId: null,
        specialistName: null,
        intentId: null,
        intentName: null,
        inputSummary: String(latestComment).slice(0, 200),
        outputSummary: `Intent classification failed: ${text.slice(0, 180)}`,
        status: "fallback",
      });
      await logTicketEvent(origin, {
        ticketId,
        eventType: "error",
        summary: "Intent classification failed",
        detail: text.slice(0, 200),
      });
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

    // Knowledge retrieval (intent/specialist scoped)
    const knowledge = await buildKnowledgeContext({
      query: latestComment,
      intentId: matchedIntent?.id ?? undefined,
      specialistId: matchedSpecialist?.id ?? undefined,
    });

    // Optional tracking enrichment
    if (trackingCandidates.length) {
      const trackingId = trackingCandidates[0];
      try {
        const trackRes = await trackOnce({ trackingId });
        trackingSummary = summarizeParcel(trackRes, trackingId);
        const scans = trackingSummary.scans?.slice(0, 3) || [];
        const scanSnippet = scans
          .map(
            (s) =>
              `${s.time || ""}${s.location ? ` @ ${s.location}` : ""}${
                s.message ? ` - ${s.message}` : ""
              }`.trim()
          )
          .filter(Boolean)
          .join(" | ");
        trackingContextText = [
          `Tracking ${trackingId}`,
          trackingSummary.status ? `Status: ${trackingSummary.status}` : null,
          trackingSummary.eta ? `ETA: ${trackingSummary.eta}` : null,
          trackingSummary.carrier ? `Carrier: ${trackingSummary.carrier}` : null,
          trackingSummary.lastEvent
            ? `Last event: ${trackingSummary.lastEvent}${
                trackingSummary.lastLocation ? ` @ ${trackingSummary.lastLocation}` : ""
              }`
            : null,
          scanSnippet ? `Recent: ${scanSnippet}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        await logTicketEvent(origin, {
          ticketId,
          eventType: "message_received",
          summary: `Tracking detected: ${trackingId}`,
          detail: trackingContextText.slice(0, 400),
        });
      } catch (e: any) {
        await logTicketEvent(origin, {
          ticketId,
          eventType: "error",
          summary: "Tracking lookup failed",
          detail: (e?.message || "Unknown error").slice(0, 300),
        });
      }
    }

    await logTicketEvent(origin, {
      ticketId,
      eventType: "intent_detected",
      summary: `Intent: ${matchedIntent?.name ?? "unknown"}`,
      detail: `Confidence: ${confidence.toFixed(2)} • Specialist: ${matchedSpecialist?.name ?? "none"}`,
    });

    // Escalation rules: if triggered, handover and skip bot reply
    if (matchedSpecialist?.escalation_rules?.trim()) {
      let escalationTriggered = false;
      let escalationReason = "";
      try {
        const escRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content:
                  'You are an escalation checker. Given rules and a customer message, decide if escalation is required. Respond ONLY with JSON {"escalate":true|false,"reason":"short"}.',
              },
              {
                role: "user",
                content: `Escalation rules:\n${matchedSpecialist.escalation_rules}\n\nCustomer message:\n${latestComment}`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0,
          }),
        });
        if (escRes.ok) {
          const escJson = await escRes.json();
          const parsed =
            (() => {
              try {
                return JSON.parse(escJson.choices?.[0]?.message?.content || "{}");
              } catch {
                return {};
              }
            })() as { escalate?: boolean; reason?: string };
          escalationTriggered = !!parsed.escalate;
          escalationReason = parsed.reason || "Escalation rule triggered";
        }
      } catch (e) {
        console.error("Escalation check failed", e);
      }

      if (escalationTriggered) {
        const { handoverRes } = await tagHandover(ticketId, zendeskSubdomain, zendeskEmail, zendeskToken);
        if (!handoverRes.ok) {
          const text = await handoverRes.text();
          await logTicketEvent(origin, {
            ticketId,
            eventType: "error",
            summary: "Failed to tag bot-handover (escalation)",
            detail: text.slice(0, 400),
          });
        }

        await logTicketEvent(origin, {
          ticketId,
          eventType: "handover",
          summary: "Escalation rule triggered",
          detail: escalationReason.slice(0, 400),
        });

        await logRun(origin, {
          ticketId,
          specialistId: matchedSpecialist?.id ?? null,
          specialistName: matchedSpecialist?.name ?? null,
          intentId: matchedIntent?.id ?? null,
          intentName: matchedIntent?.name ?? null,
          inputSummary: String(latestComment).slice(0, 200),
          outputSummary: escalationReason.slice(0, 200),
          status: "escalated",
        });

        return NextResponse.json({
          status: "handover",
          ticketId,
          intentId: matchedIntent?.id ?? null,
          specialistId: matchedSpecialist?.id ?? null,
          reason: escalationReason,
        });
      }
    }

    if (!matchedIntent || !matchedSpecialist || confidence < CONFIDENCE_THRESHOLD) {
      await saveIntentSuggestion(
        origin,
        latestComment,
        ticketId,
        confidence,
        openaiKey
      );
      const authString = Buffer.from(
        `${zendeskEmail}/token:${zendeskToken}`
      ).toString("base64");

      const zendeskUrl = `https://${zendeskSubdomain}.zendesk.com/api/v2/tickets/${ticketId}.json`;

      const handoverRes = await fetch(zendeskUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify({
          ticket: {
            tags: ["bot-handover"],
          },
        }),
      });

      if (!handoverRes.ok) {
        const text = await handoverRes.text();
        await logTicketEvent(origin, {
          ticketId,
          eventType: "error",
          summary: "Failed to tag bot-handover",
          detail: text.slice(0, 400),
        });
      } else {
        const respText = await handoverRes.text();
        let tagsSnippet = respText.slice(0, 200);
        try {
          const parsed = JSON.parse(respText);
          const tags = parsed?.ticket?.tags;
          if (Array.isArray(tags)) {
            tagsSnippet = `Tags after update: ${tags.join(", ")}`;
          }
        } catch {
          // ignore parse errors, keep snippet
        }
        await logTicketEvent(origin, {
          ticketId,
          eventType: "zendesk_update",
          summary: "Tag added: bot-handover",
          detail: tagsSnippet,
        });
        await logTicketEvent(origin, {
          ticketId,
          eventType: "handover",
          summary:
            confidence < CONFIDENCE_THRESHOLD
              ? "Low confidence; tagged bot-handover"
              : "No specialist matched; tagged bot-handover",
          detail: `Confidence ${confidence.toFixed(2)}, intent ${matchedIntent?.name ?? "unknown"} • Zendesk response: ${tagsSnippet}`,
        });
      }

      await logRun(origin, {
        ticketId,
        specialistId: null,
        specialistName: null,
        intentId: matchedIntent?.id ?? null,
        intentName: matchedIntent?.name ?? null,
        inputSummary: String(latestComment).slice(0, 200),
        outputSummary:
          confidence < CONFIDENCE_THRESHOLD
            ? "Low confidence intent match; handed to human."
            : "No specialist matched; handed to human.",
        status: "fallback",
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
        content: `You are a professional customer support email agent.\nSpecialist: ${matchedSpecialist.name}\nDescription: ${matchedSpecialist.description}\nPersonality: ${matchedSpecialist.personality_notes}\nRequired fields: ${matchedSpecialist.required_fields?.join(", ") || "none"}`,
      },
      {
        role: "user",
        content: `Ticket ID: ${ticketId}\nCustomer email: ${requesterEmail}\nTracking context: ${
          trackingContextText || "none available"
        }\n\nCustomer message:\n"""\n${latestComment}\n"""\n\nWrite a clear, polite email reply in a professional tone. If information is missing, ask for the needed details instead of guessing.`,
      },
    ];

    if (knowledge.summary) {
      replyPrompt.unshift({
        role: "system",
        content: `Relevant policies for this intent:\n${knowledge.summary}`,
      });
    }

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
      await logRun(origin, {
        ticketId,
        specialistId: matchedSpecialist.id,
        specialistName: matchedSpecialist.name,
        intentId: matchedIntent?.id ?? null,
        intentName: matchedIntent?.name ?? null,
        inputSummary: String(latestComment).slice(0, 200),
        outputSummary: `Reply generation failed: ${text.slice(0, 180)}`,
        status: "fallback",
      });
      await logTicketEvent(origin, {
        ticketId,
        eventType: "error",
        summary: "Reply generation failed",
        detail: text.slice(0, 200),
      });
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
      await logRun(origin, {
        ticketId,
        specialistId: matchedSpecialist.id,
        specialistName: matchedSpecialist.name,
        intentId: matchedIntent?.id ?? null,
        intentName: matchedIntent?.name ?? null,
        inputSummary: String(latestComment).slice(0, 200),
        outputSummary: `Zendesk API error: ${text.slice(0, 180)}`,
        status: "fallback",
      });
      await logTicketEvent(origin, {
        ticketId,
        eventType: "error",
        summary: "Zendesk API error",
        detail: text.slice(0, 200),
      });
      return NextResponse.json(
        { error: "Zendesk API error", details: text },
        { status: 500 }
      );
    }

    await logRun(origin, {
      ticketId,
      specialistId: matchedSpecialist.id,
      specialistName: matchedSpecialist.name,
      intentId: matchedIntent?.id ?? null,
      intentName: matchedIntent?.name ?? null,
      inputSummary: String(latestComment).slice(0, 200),
      outputSummary: [
        aiReply.slice(0, 160),
        trackingContextText ? `Tracking: ${trackingContextText.slice(0, 200)}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
      status: "success",
    });
    await logTicketEvent(origin, {
      ticketId,
      eventType: "reply_sent",
      summary: "Reply sent to Zendesk",
      detail: `Specialist: ${matchedSpecialist.name}; Intent: ${matchedIntent?.name ?? "unknown"}`,
    });
    await logTicketEvent(origin, {
      ticketId,
      eventType: "zendesk_update",
      summary: "Public reply posted to Zendesk",
      detail: aiReply.slice(0, 240),
    });

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
