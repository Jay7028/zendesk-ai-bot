// VERY SIMPLE IN-MEMORY STORE – resets when the server restarts

export type TabKey = "data" | "knowledge" | "escalation" | "personality";

export interface SpecialistConfig {
  id: string;
  name: string;
  description: string;
  active: boolean;
  docsCount: number;
  rulesCount: number;
  dataExtractionPrompt: string;
  requiredFields: string[];
  knowledgeBaseNotes: string;
  escalationRules: string;
  personalityNotes: string;
}

// pretend database
let specialists: SpecialistConfig[] = [
  {
    id: "refund-specialist",
    name: "Refund Specialist",
    description: "Handles billing disputes and refund requests.",
    active: true,
    docsCount: 2,
    rulesCount: 3,
    dataExtractionPrompt:
      "Extract refund-related details such as order_number, email, refund_reason and amount_requested.",
    requiredFields: ["order_number", "email", "refund_reason"],
    knowledgeBaseNotes:
      "Uses the refund policy documents and chargeback guidance as primary sources.",
    escalationRules:
      "Escalate if refund value > £250, repeated disputes on same customer, or fraud suspected.",
    personalityNotes:
      "Empathetic, concise, clear about what can and cannot be done.",
  },
  {
    id: "order-tracker",
    name: "Order Tracker",
    description: "Provides tracking information and delivery status updates.",
    active: true,
    docsCount: 2,
    rulesCount: 1,
    dataExtractionPrompt:
      "Extract the tracking_number or order_number and postcode before giving tracking information.",
    requiredFields: ["tracking_number", "postcode"],
    knowledgeBaseNotes:
      "Uses carrier APIs and delivery SLA documents for responses.",
    escalationRules:
      "Escalate if parcel shows delivered but customer claims non-receipt.",
    personalityNotes:
      "Practical, reassuring, focuses on next steps and timeframes.",
  },
];

export function getAllSpecialists() {
  return specialists;
}

export function getSpecialist(id: string) {
  return specialists.find((s) => s.id === id) ?? null;
}

export function updateSpecialist(updated: SpecialistConfig) {
  specialists = specialists.map((s) => (s.id === updated.id ? updated : s));
  return updated;
}

export function createSpecialist(input: Omit<SpecialistConfig, "id">) {
  const id = `specialist-${Date.now()}`;
  const created: SpecialistConfig = { id, ...input };
  specialists.push(created);
  return created;
}
