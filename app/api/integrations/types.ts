export interface IntegrationConfig {
  id: string;
  name: string;
  type: string; // e.g., "zendesk", "openai", "custom"
  description: string;
  apiKey: string;
  apiKeyLast4?: string;
  baseUrl: string;
  enabled: boolean;
}
