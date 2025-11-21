// Very simple in-memory log store – resets when server restarts.

export type LogStatus = "success" | "fallback" | "escalated";

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string
  zendeskTicketId: string;
  specialistId: string;
  specialistName: string;
  inputSummary: string;
  knowledgeSources: string[]; // e.g. ["refund_policy_v3.pdf"]
  outputSummary: string;
  status: LogStatus;
}

let logs: LogEntry[] = [];

export function getAllLogs() {
  // newest first
  return logs.slice().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export function addLogEntry(entry: Omit<LogEntry, "id" | "timestamp">) {
  const full: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  logs.push(full);
  return full;
}
