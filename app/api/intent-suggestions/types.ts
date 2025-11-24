export interface IntentSuggestion {
  id: string;
  ticketId: string;
  messageSnippet: string;
  suggestedName: string;
  suggestedDescription: string;
  confidence: number;
  createdAt: string;
}
