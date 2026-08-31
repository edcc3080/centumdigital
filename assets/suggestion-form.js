import { supabase, isSupabaseConfigured } from "./supabase-config.js";

const form = document.getElementById("suggestionForm");
const message = document.getElementById("suggestionMessage");

function setMessage(text, type = "info") {
  if (!message) return;
  message.textContent = text;
  message.dataset.type = type;
  message.hidden = false;
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      setMessage("아직 건의함 서버 연결 전입니다. 관리자에게 문의해 주세요.", "error");
      return;
    }

    const honeypot = form.querySelector('[name="website"]')?.value || "";
    if (honeypot) return;

    const identityValue =
      form.querySelector('[name="identity"]:checked')?.value || "익명";

    const category = document.getElementById("suggestCat").value.trim();
    const name = document.getElementById("suggestName").value.trim();
    const title = document.getElementById("suggestTitle").value.trim();
    const content = document.getElementById("suggestText").value.trim();
    const contact = document.getElementById("suggestContact").value.trim();

    if (!category || !title || !content) {
      setMessage("건의 분야, 제목, 내용을 입력해 주세요.", "error");
      return;
    }

    if (title.length > 150 || content.length > 5000) {
      setMessage("제목은 150자, 내용은 5,000자 이내로 작성해 주세요.", "error");
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "제출 중...";

    const { error } = await supabase
      .from("suggestions")
      .insert({
        identity_type: identityValue === "실명" ? "named" : "anonymous",
        category,
        name: identityValue === "실명" ? name : null,
        contact: contact || null,
        title,
        content
      });

    submit.disabled = false;
    submit.textContent = "건의사항 제출하기";

    if (error) {
      console.error(error);
      setMessage("제출하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
      return;
    }

    form.reset();
    form.querySelector('[name="identity"][value="익명"]').checked = true;
    setMessage("소중한 의견이 접수되었습니다. 감사합니다.", "success");
  });
}
