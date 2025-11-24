export type TicketEventType =
  | "message_received"
  | "intent_detected"
  | "specialist_selected"
  | "reply_sent"
  | "handover"
  | "zendesk_update"
  | "error";

export interface TicketEvent {
  id: string;
  ticketId: string;
  eventType: TicketEventType;
  summary: string;
  detail: string;
  createdAt: string;
}
