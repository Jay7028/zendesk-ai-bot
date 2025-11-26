import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Default org context for now; replace with per-user org selection when auth is wired.
export const defaultOrgId =
  process.env.DEFAULT_ORG_ID ||
  process.env.NEXT_PUBLIC_DEFAULT_ORG_ID ||
  "11111111-1111-1111-1111-111111111111";

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
