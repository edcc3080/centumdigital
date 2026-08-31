import { supabase, isSupabaseConfigured } from "../assets/supabase-config.js";

export { supabase, isSupabaseConfigured };

export const POST_CATEGORIES = {
  notice: "공지사항",
  open: "개강 안내",
  recruit: "모집중인 과정",
  schedule: "교육 일정",
  data: "자료실",
  review: "수강생 후기",
  work: "수강생 작품",
  job: "취업 · 창업 이야기",
  gallery: "포토갤러리"
};

export const SUGGESTION_STATUS = {
  new: "새 건의",
  reviewing: "확인 중",
  done: "처리 완료"
};

export function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function fmtDate(value, withTime = false) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(new Date(value));
}

export function toast(text) {
  const old = document.querySelector(".toast");
  old?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

export async function requireAdmin() {
  if (!isSupabaseConfigured) {
    alert("Supabase 연결 설정이 아직 입력되지 않았습니다.");
    location.href = "login.html";
    throw new Error("Supabase not configured");
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    location.href = "login.html";
    throw new Error("No session");
  }

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("user_id, display_name")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !admin) {
    await supabase.auth.signOut();
    alert("관리자 권한이 없는 계정입니다.");
    location.href = "login.html";
    throw new Error("Not admin");
  }

  document.querySelectorAll("[data-admin-name]")
    .forEach(el => el.textContent = admin.display_name || session.user.email);

  return { session, admin };
}

export function bindLogout() {
  document.querySelectorAll("[data-logout]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      location.href = "login.html";
    });
  });
}
