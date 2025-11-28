export async function evaluateEscalationRule(options: {
  rulesText: string;
  customerMessage: string;
  openaiKey: string;
  conversationHistory?: string;
}) {
  const { rulesText, customerMessage, openaiKey, conversationHistory } = options;
  const effectiveMessage = conversationHistory
    ? `${conversationHistory}\nLatest customer message:\n${customerMessage}`
    : customerMessage;
  try {
    const res = await fetch("https://api.openai.com/v1/chat.completions", {
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
              "You are an escalation checker. Interpret the plain-English rule text, then decide whether the provided customer message satisfies it. Always respond with JSON only, like {\"escalate\":true,\"reason\":\"short explanation\"} or {\"escalate\":false,\"reason\":\"short explanation\"}.",
          },
          {
            role: "user",
            content: `Escalation rules: ${rulesText}\n\nCustomer message:\n${effectiveMessage}\n\nIf the rule is satisfied, return {"escalate": true, "reason": "rule satisfied"}; otherwise return {"escalate": false, "reason": "not satisfied"}.`,
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

export async function detectEscalationFields(params: {
  conversation: string;
  openaiKey: string;
}) {
  const { conversation, openaiKey } = params;
  try {
    const res = await fetch("https://api.openai.com/v1/chat.completions", {
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
              "You are a semantic extractor. Given a conversation, tell me whether the customer has provided (1) an item description, (2) a quantity or frequency, and (3) interest in labeling or fulfillment services. Respond with JSON {\"item\":true|false,\"quantity\":true|false,\"services\":true|false}.",
          },
          {
            role: "user",
            content: `Conversation:\n${conversation}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Field detection error:", text);
      return { item: false, quantity: false, services: false };
    }
    const json = await res.json();
    const parsed =
      (() => {
        try {
          return JSON.parse(json.choices?.[0]?.message?.content || "{}");
        } catch {
          return {};
        }
      })() as { item?: boolean; quantity?: boolean; services?: boolean };
    return {
      item: parsed.item ?? false,
      quantity: parsed.quantity ?? false,
      services: parsed.services ?? false,
    };
  } catch (err) {
    console.error("Field detection exception", err);
    return { item: false, quantity: false, services: false };
  }
}

export async function evaluateRuleTrigger(triggerText: string, conversation: string, openaiKey: string) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat.completions", {
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
              "You check whether a plain-English trigger is satisfied by this conversation. Respond ONLY with JSON: {\"true\":true|false,\"reason\":\"short\"}.",
          },
          {
            role: "user",
            content: `Trigger: ${triggerText}\n\nConversation:\n${conversation}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Rule trigger eval error:", text);
      return { match: false, reason: "eval failed" };
    }
    const json = await res.json();
    const parsed =
      (() => {
        try {
          return JSON.parse(json.choices?.[0]?.message?.content || "{}");
        } catch {
          return {};
        }
      })() as { true?: boolean; reason?: string };
    return { match: !!parsed.true, reason: parsed.reason || "" };
  } catch (e) {
    console.error("Rule trigger exception", e);
    return { match: false, reason: "exception" };
  }
}
