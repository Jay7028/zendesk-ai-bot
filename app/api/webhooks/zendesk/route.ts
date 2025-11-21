import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const ticketId = body.ticket_id ?? body.id ?? "UNKNOWN";
    const latestComment =
      body.latest_comment ??
      body.comment ??
      body.description ??
      "No customer message provided.";
    const requesterEmail =
      body.requester_email ?? body.requester?.email ?? "unknown@example.com";

    console.log("🔥 Incoming Zendesk webhook payload:", body);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not set on server" },
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error (webhook):", text);
      return NextResponse.json(
        { error: "OpenAI API error", details: text },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiReply =
      data.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I could not generate a reply.";

    return NextResponse.json({
      status: "ok",
      ticketId,
      aiReply,
    });
  } catch (err: any) {
    console.error("Error in /api/webhooks/zendesk:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
