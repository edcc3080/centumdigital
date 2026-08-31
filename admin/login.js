import { supabase, isSupabaseConfigured } from "../assets/supabase-config.js";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

function showError(text) {
  errorBox.textContent = text;
  errorBox.hidden = false;
}

(async () => {
  if (!isSupabaseConfigured) {
    showError("먼저 assets/supabase-config.js에 Supabase URL과 Publishable/anon key를 입력해 주세요.");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (admin) location.href = "index.html";
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.hidden = true;

  if (!isSupabaseConfigured) {
    showError("Supabase 연결 설정이 아직 입력되지 않았습니다.");
    return;
  }

  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = "로그인 중...";

  const { data, error } = await supabase.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  });

  if (error) {
    button.disabled = false;
    button.textContent = "로그인";
    showError("이메일 또는 비밀번호를 확인해 주세요.");
    return;
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await supabase.auth.signOut();
    button.disabled = false;
    button.textContent = "로그인";
    showError("관리자 권한이 등록되지 않은 계정입니다.");
    return;
  }

  location.href = "index.html";
});
