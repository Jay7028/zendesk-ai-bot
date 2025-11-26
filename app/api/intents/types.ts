export interface IntentConfig {
  id: string;
  name: string;
  description: string;
  specialistId: string | null;
  orgId?: string;
}
