import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/*
  센텀디지털캠프 Supabase 연결 설정
  - Publishable key는 웹 브라우저에서 사용하는 공개용 키입니다.
  - service_role / secret key는 절대로 이 파일에 넣지 마세요.
*/

export const SUPABASE_URL = "https://msbqheljruwfnbccsyev.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_js1DVorSOGpE-krQH-7X7w_46do4pjV";

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_URL.includes(".supabase.co") &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

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
