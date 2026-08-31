import { supabase, isSupabaseConfigured } from "./supabase-config.js";

const form = document.getElementById("consultationForm");
const messageBox = document.getElementById("consultationMessage");

function showMessage(text, type = "info") {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.dataset.type = type;
  messageBox.hidden = false;
}

function normalizePhone(value = "") {
  return String(value).replace(/\D/g, "");
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      showMessage("상담 접수 서버 연결을 확인해 주세요.", "error");
      return;
    }

    if (form.querySelector('[name="website"]')?.value) return;

    const name = document.getElementById("consultName").value.trim();
    const phone = normalizePhone(document.getElementById("consultPhone").value);
    const interest = document.getElementById("consultInterest").value.trim();
    const contactMethod = document.getElementById("consultMethod").value.trim();
    const message = document.getElementById("consultText").value.trim();
    const consent = document.getElementById("consultConsent").checked;

    if (!name || !phone || !interest || !consent) {
      showMessage("이름, 연락처, 관심 분야와 개인정보 동의를 확인해 주세요.", "error");
      return;
    }

    if (!/^01\d{8,9}$/.test(phone)) {
      showMessage("연락처를 정확하게 입력해 주세요.", "error");
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "접수 중...";

    const { error } = await supabase.from("consultations").insert({
      name,
      phone,
      interest,
      contact_method: contactMethod || "전화 상담",
      message: message || null
    });

    button.disabled = false;
    button.textContent = "상담 신청하기";

    if (error) {
      console.error(error);
      showMessage("상담 접수 중 오류가 발생했습니다. 051-710-0775로 문의해 주세요.", "error");
      return;
    }

    form.reset();
    showMessage("수강상담이 접수되었습니다. 확인 후 연락드리겠습니다.", "success");
  });
}
