import { NextRequest, NextResponse } from "next/server";

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

    console.log("🔥 Incoming Zendesk webhook payload:", body);

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

    const prompt = `
You are a helpful customer service email agent replying to a Zendesk ticket.

Ticket ID: ${ticketId}
Customer email: ${requesterEmail}

Customer message:
"""
${latestComment}
"""

Write a clear, polite email reply in a professional tone.
If information is missing, ask for the needed details instead of guessing.
`;

    // 1) Get AI reply
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: "You are a professional customer support email agent.",
          },
          { role: "user", content: prompt },
        ],
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
          specialistId: "unknown",        // later: real specialist ID
          specialistName: "unknown",      // later: real specialist name
          inputSummary: String(latestComment).slice(0, 200),
          knowledgeSources: [],           // later: KB IDs / names
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
    });
  } catch (err: any) {
    console.error("Error in /api/webhooks/zendesk:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
