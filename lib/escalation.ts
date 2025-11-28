export async function evaluateEscalationRule(options: {
  rulesText: string;
  customerMessage: string;
  openaiKey: string;
}) {
  const { rulesText, customerMessage, openaiKey } = options;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
              "You are an escalation checker. Interpret the plain-English rule text, then evaluate whether the current customer message satisfies it. Always respond with JSON only, like {\"escalate\":true,\"reason\":\"short explanation\"} or {\"escalate\":false,\"reason\":\"short explanation\"}.",
          },
          {
            role: "user",
            content: `Escalation rules:\n${rulesText}\n\nCustomer message:\n${customerMessage}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Escalation checker API error:", text);
      return { escalate: false, reason: "Escalation check failed" };
    }
    const json = await res.json();
    const parsed =
      (() => {
        try {
          return JSON.parse(json.choices?.[0]?.message?.content || "{}");
        } catch {
          return {};
        }
      })() as { escalate?: boolean; reason?: string };
    return {
      escalate: !!parsed.escalate,
      reason: parsed.reason || "Escalation rule triggered",
    };
  } catch (err) {
    console.error("Escalation checker exception", err);
    return { escalate: false, reason: "Escalation check failed" };
  }
}
