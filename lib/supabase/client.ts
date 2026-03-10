import { env } from "@/lib/env";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
