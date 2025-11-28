import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { trackOnce, summarizeParcel, type ParcelSummary } from "../../../lib/parcelsapp";
import { buildKnowledgeContext } from "../../../lib/knowledge";
import { requireOrgContext } from "../../../lib/auth";

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

function isTrackingRequest(message: string, intentName?: string | null) {
  if (!message) return false;
  const lowerMessage = message.toLowerCase();
  const keywords = [
    "track",
    "where is",
    "delivery status",
    "order status",
    "parcel",
    "shipping status",
    "tracking",
  ];
  if (intentName && intentName.toLowerCase().includes("track")) {
    return true;
  }
  return keywords.some((keyword) => lowerMessage.includes(keyword));
}

type Message = { role: "user" | "assistant"; content: string };

async function logRun(
  origin: string,
  payload: {
    ticketId: string;
    specialistId: string | null;
    specialistName: string | null;
    intentId: string | null;
    intentName: string | null;
    inputSummary: string;
    outputSummary: string;
    status: "success" | "fallback" | "escalated";
    knowledgeSources?: string[];
    authHeader?: string | null;
  }
) {
  try {
    await fetch(new URL("/api/logs", origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(payload.authHeader ? { Authorization: payload.authHeader } : {}),
      },
      body: JSON.stringify({
        zendeskTicketId: payload.ticketId,
        specialistId: payload.specialistId ?? "unknown",
        specialistName: payload.specialistName ?? "unknown",
        intentId: payload.intentId,
        intentName: payload.intentName,
        inputSummary: payload.inputSummary,
        knowledgeSources: payload.knowledgeSources ?? [],
        outputSummary: payload.outputSummary,
        status: payload.status,
      }),
    });
  } catch (e) {
    console.error("Failed to log test run", e);
  }
}

async function logTicketEvent(
  origin: string,
  payload: { ticketId: string; eventType: string; summary: string; detail?: string; authHeader?: string | null }
) {
  try {
    await fetch(new URL("/api/ticket-events", origin), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(payload.authHeader ? { Authorization: payload.authHeader } : {}),
      },
      body: JSON.stringify({
        ticketId: payload.ticketId,
        eventType: payload.eventType,
        summary: payload.summary,
        detail: payload.detail ?? "",
      }),
    });
  } catch (e) {
    console.error("Failed to log test ticket event", e);
  }
}

function extractTrackingCandidates(text: string): string[] {
  if (!text) return [];
  const matches = text.toUpperCase().match(/\b[A-Z0-9]{10,22}\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function sanitizeIntentTag(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrgContext(req);
    const body = await req.json();
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || null;
    const messages: Message[] = Array.isArray(body.messages)
      ? body.messages
      : body.message
      ? [{ role: "user", content: body.message }]
      : [];
    const isFirstMessage = !body.previousIntentId && !body.previousSpecialistId;
    const previousIntentId: string | undefined = body.previousIntentId || undefined;
    const previousSpecialistId: string | undefined = body.previousSpecialistId || undefined;

    const latestUser = [...messages].reverse().find((m) => m.role === "user");
    const userMessage = latestUser?.content?.trim() || "No message provided";
    const requestedTrackingNumber: string | undefined =
      (body.trackingNumber || body.tracking_number || "").toString().trim() || undefined;
    const requestedCourier: string | undefined =
      (body.courierCode || body.courier_code || "").toString().trim() || undefined;
    const requestedDestination: string | undefined = undefined;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY not set on server" }, { status: 500 });
    }
    const ticketId: string = body.ticketId || `test-${Date.now()}`;

    const [{ data: intentRows, error: intentsError }, { data: specRows, error: specsError }] =
      await Promise.all([
        supabaseAdmin.from("intents").select("*").eq("org_id", orgId),
        supabaseAdmin.from("specialists").select("*").eq("org_id", orgId),
      ]);

    if (intentsError || specsError) {
      console.error("Supabase load error", intentsError || specsError);
      return NextResponse.json({ error: "Failed to load intents/specialists" }, { status: 500 });
    }

    const intents: IntentRow[] = intentRows ?? [];
    const specialists: SpecialistRow[] = specRows ?? [];

    const actions: string[] = [];
    const origin = req.nextUrl.origin;

    const intentListForPrompt = intents
      .map((i) => `- ${i.id}: ${i.name} - ${i.description}`)
      .join("\n");
    const conversationSummary = messages
      .map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`)
      .join("\n");

    const classifyPrompt = [
      {
        role: "system",
        content:
          'You are an intent classifier. Choose the single best intent_id for the user message from the provided list. Respond ONLY with a JSON object like {"intent_id":"<id-or-unknown>","confidence":0.0-1.0}. If none fit or confidence is low, use "unknown" and confidence 0.',
      },
      {
        role: "user",
        content: `Conversation so far:\n${conversationSummary}\n\nUser message to classify intent on: """${userMessage}"""\n\nIntents:\n${intentListForPrompt}\n\nReturn a JSON object with intent_id and confidence. If unsure, use "unknown" and confidence 0.`,
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
      return NextResponse.json({ error: "OpenAI intent classify error", details: text }, { status: 500 });
    }

    const classifyJson = await classifyRes.json();
    const parsedClassify =
      (() => {
        try {
          return JSON.parse(classifyJson.choices?.[0]?.message?.content || "{}");
        } catch {
          return {};
        }
      })() as { intent_id?: string; confidence?: number };

    const intentId = parsedClassify.intent_id || intents[0]?.id;
    const confidence = typeof parsedClassify.confidence === "number" ? parsedClassify.confidence : 0;
    const CONFIDENCE_THRESHOLD = 0.6;

    let matchedIntent =
      confidence >= CONFIDENCE_THRESHOLD
        ? intents.find((i) => i.id === intentId) ?? null
        : null;
    const candidateSpecialistId =
      confidence >= CONFIDENCE_THRESHOLD ? matchedIntent?.specialist_id : undefined;
    let matchedSpecialist = candidateSpecialistId
      ? specialists.find((s) => s.id === candidateSpecialistId) ?? null
      : null;

    if ((!matchedIntent || confidence < CONFIDENCE_THRESHOLD) && previousIntentId) {
      const priorIntent = intents.find((i) => i.id === previousIntentId) ?? matchedIntent;
      matchedIntent = priorIntent ?? matchedIntent;

      const priorSpecId =
        priorIntent?.specialist_id || previousSpecialistId || undefined;
      if (priorSpecId) {
        const priorSpec = specialists.find((s) => s.id === priorSpecId) ?? matchedSpecialist;
        matchedSpecialist = priorSpec ?? matchedSpecialist;
      }
      actions.push("Low confidence; retaining prior intent/specialist for context.");
    }

    actions.push(
      `Classified intent: ${matchedIntent?.name ?? "unknown"} (confidence ${confidence.toFixed(2)})`
    );
    if (matchedSpecialist) {
      actions.push(`Routed to specialist: ${matchedSpecialist.name}`);
    } else {
      actions.push("No specialist matched (unknown or low confidence)");
      actions.push("Would tag: bot-handover");
    }
    if (isFirstMessage && matchedIntent) {
      const firstTag = `intent_${sanitizeIntentTag(matchedIntent.name || matchedIntent.id)}`;
      actions.push(`Would tag: ${firstTag}`);
    }

    // Optional tracking enrichment
    let trackingSummary: ParcelSummary | null = null;
    const trackingNumber =
      requestedTrackingNumber ||
      extractTrackingCandidates(userMessage).find((n) => n.length >= 10);
    const hasTrackingKey = process.env.PARCELSAPP_API_KEY;
    const shouldTrack = isTrackingRequest(userMessage, matchedIntent?.name ?? null);

    if (shouldTrack && trackingNumber && hasTrackingKey) {
      try {
        const info = await trackOnce({
          trackingId: trackingNumber,
        });
        trackingSummary = summarizeParcel(info, trackingNumber);
        const summaryText = `Tracking ${trackingNumber} (${trackingSummary.carrier || "unknown"}) status: ${trackingSummary.status || "unknown"}; ETA: ${trackingSummary.eta || "n/a"}; Last: ${trackingSummary.lastEvent || "n/a"}`;
        actions.push(summaryText);
        const scans = trackingSummary.scans?.slice(0, 3) || [];
        const scanText =
          scans.length > 0
            ? scans
                .map((s) => `${s.time || ""} ${s.location ? `@ ${s.location}` : ""} ${s.message || ""}`.trim())
                .join(" | ")
            : "";
        await logTicketEvent(origin, {
          ticketId,
          eventType: "zendesk_update",
          summary: "Tracking fetched",
          detail: scans.length ? `${summaryText} | Recent: ${scanText}` : summaryText,
          authHeader,
        });
      } catch (err: any) {
        actions.push(`Tracking lookup failed for ${trackingNumber}: ${err?.message || err}`);
      }
    }
    else if (shouldTrack && trackingNumber && !hasTrackingKey) {
      actions.push("Tracking lookup skipped: Parcelsapp API key missing");
    }

    await logTicketEvent(origin, {
      ticketId,
      eventType: "intent_detected",
      summary: `Intent: ${matchedIntent?.name ?? "unknown"}`,
      detail: `Confidence: ${confidence.toFixed(2)} | Specialist: ${matchedSpecialist?.name ?? "none"}`,
      authHeader,
    });

    // Knowledge retrieval (intent/specialist scoped)
    const knowledge = await buildKnowledgeContext({
      query: userMessage,
      intentId: matchedIntent?.id ?? undefined,
      specialistId: matchedSpecialist?.id ?? undefined,
      orgId,
    });

    const replyMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      {
        role: "system",
        content: matchedSpecialist
          ? `You are a helpful customer service email assistant.\nSpecialist: ${matchedSpecialist.name}\nDescription: ${matchedSpecialist.description}\nPersonality: ${matchedSpecialist.personality_notes}\nRequired fields: ${matchedSpecialist.required_fields?.join(", ") || "none"}`
          : "You are a helpful customer service email assistant.",
      },
    ];

    if (knowledge.summary) {
      replyMessages.unshift({
        role: "system",
        content: `Relevant policies for this intent:\n${knowledge.summary}`,
      });
      actions.push("Applied retrieved knowledge to guide reply.");
    }

    if (trackingSummary) {
      replyMessages.unshift({
        role: "system",
        content: `Tracking info: number ${trackingSummary.trackingId} (${trackingSummary.carrier || "unknown carrier"}); status: ${trackingSummary.status || "unknown"}; ETA: ${trackingSummary.eta || "n/a"}; Last event: ${trackingSummary.lastEvent || "n/a"}. Include this tracking update in your reply if the user asked about parcel status.`,
      });
      if (trackingSummary.scans?.length) {
        const lastScans = trackingSummary.scans.slice(-3);
        const scanLines = lastScans
          .map((s) => `${s.time || ""} ${s.location ? `@ ${s.location}` : ""} ${s.message || ""}`.trim())
          .join(" | ");
        replyMessages.unshift({
          role: "system",
          content: `Recent scans: ${scanLines}`,
        });
      }
    }

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
      return NextResponse.json({ error: "OpenAI API error", details: text }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "";

    actions.push("Generated reply");

    const knowledgeSources: string[] = [];
    if (trackingSummary) {
      knowledgeSources.push(
        `tracking ${trackingSummary.trackingId} (${trackingSummary.carrier || "unknown"}) status:${trackingSummary.status || "unknown"} eta:${trackingSummary.eta || "n/a"} last:${trackingSummary.lastEvent || "n/a"}`
      );
    }
    if (knowledge.used?.length) {
      knowledgeSources.push(
        ...knowledge.used.map((c) => `knowledge: ${c.title || c.id}`)
      );
    }

    await logRun(origin, {
      ticketId,
      specialistId: matchedSpecialist?.id ?? null,
      specialistName: matchedSpecialist?.name ?? null,
      intentId: matchedIntent?.id ?? null,
      intentName: matchedIntent?.name ?? null,
      inputSummary: userMessage.slice(0, 200),
      outputSummary: reply.slice(0, 200),
      status: "success",
      knowledgeSources,
      authHeader,
    });
    await logTicketEvent(origin, {
      ticketId,
      eventType: "reply_sent",
      summary: "Reply generated (test)",
      detail: reply.slice(0, 240),
      authHeader,
    });

    return NextResponse.json({
      reply,
      intentId: matchedIntent?.id ?? null,
      intentName: matchedIntent?.name ?? null,
      specialistId: matchedSpecialist?.id ?? null,
      specialistName: matchedSpecialist?.name ?? null,
      trackingSummary: trackingSummary ?? null,
      actions,
      ticketId,
      inputSummary: userMessage,
    });
  } catch (err: any) {
    console.error("Error in /api/test-ai:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
