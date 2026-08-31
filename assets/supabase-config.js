import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/*
  ==========================================================
  Supabase 연결 설정
  ==========================================================
  1. 아래 URL에 Supabase Project URL을 입력하세요.
  2. 아래 KEY에 Publishable key 또는 anon key를 입력하세요.
  3. 절대로 service_role key를 넣지 마세요.
*/

export const SUPABASE_URL = "https://msbqheljruwfnbccsyev.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_js1DVorSOGpE-krQH-7X7w_46do4pjV";

export const isSupabaseConfigured =
  !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
  !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
