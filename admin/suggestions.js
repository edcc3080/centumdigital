import { supabase, requireAdmin, bindLogout, SUGGESTION_STATUS, esc, fmtDate, toast } from "./admin-common.js";

await requireAdmin();
bindLogout();

let rows = [];
let selectedId = new URLSearchParams(location.search).get("id");

const categorySelect = document.getElementById("suggestCategory");
const fixedCategories = ["시설 · 환경","국민내일배움카드 과정","강사 · 수업","교육과정 제안","행정 · 상담","홈페이지","기타"];
fixedCategories.forEach(c => categorySelect.insertAdjacentHTML("beforeend", `<option>${c}</option>`));

async function load() {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    document.getElementById("suggestionList").innerHTML = '<div class="empty">건의사항을 불러오지 못했습니다.</div>';
    return;
  }

  rows = data || [];
  renderList();

  if (selectedId) {
    const row = rows.find(r => r.id === selectedId);
    if (row) showDetail(row);
  }
}

function filteredRows() {
  const text = document.getElementById("suggestSearch").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const cat = categorySelect.value;

  return rows.filter(r =>
    (!text || `${r.title} ${r.content}`.toLowerCase().includes(text)) &&
    (!status || r.status === status) &&
    (!cat || r.category === cat)
  );
}

function renderList() {
  const filtered = filteredRows();
  document.getElementById("suggestionList").innerHTML = filtered.length
    ? filtered.map(r => `
      <div class="suggestion-item" data-id="${r.id}">
        <div class="suggestion-item-top">
          <span class="badge purple">${esc(r.category)}</span>
          <span class="badge ${r.status==='done'?'green':r.status==='reviewing'?'orange':''}">
            ${esc(SUGGESTION_STATUS[r.status] || r.status)}
          </span>
        </div>
        <h4>${esc(r.title)}</h4>
        <p>${esc(r.content)}</p>
      </div>`).join("")
    : '<div class="empty">조건에 맞는 건의가 없습니다.</div>';

  document.querySelectorAll(".suggestion-item").forEach(el => {
    el.addEventListener("click", () => {
      selectedId = el.dataset.id;
      showDetail(rows.find(r => r.id === selectedId));
    });
  });
}

function showDetail(r) {
  if (!r) return;
  document.getElementById("suggestionDetail").innerHTML = `
    <div class="detail-box">
      <div class="detail-meta">
        <span class="badge purple">${esc(r.category)}</span>
        <span class="badge">${r.identity_type === "named" ? "실명" : "익명"}</span>
        <span class="badge gray">${fmtDate(r.created_at, true)}</span>
      </div>
      <h3>${esc(r.title)}</h3>
      <p>${esc(r.content)}</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0">
      <p><strong>작성자</strong> ${r.identity_type === "named" ? esc(r.name || "-") : "익명"}</p>
      <p><strong>연락처</strong> ${esc(r.contact || "미입력")}</p>
      <div class="form-actions">
        <button class="a-btn a-neutral" data-status="new">새 건의</button>
        <button class="a-btn a-soft" data-status="reviewing">확인 중</button>
        <button class="a-btn a-primary" data-status="done">처리 완료</button>
        <button class="a-btn a-danger" id="deleteSuggestion">삭제</button>
      </div>
    </div>`;

  document.querySelectorAll("[data-status]").forEach(btn => {
    btn.addEventListener("click", () => updateStatus(r.id, btn.dataset.status));
  });

  document.getElementById("deleteSuggestion").addEventListener("click", async () => {
    if (!confirm("이 건의사항을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("suggestions").delete().eq("id", r.id);
    if (error) return alert("삭제하지 못했습니다.");
    selectedId = null;
    document.getElementById("suggestionDetail").innerHTML = '<div class="empty">왼쪽에서 건의를 선택해 주세요.</div>';
    toast("건의사항을 삭제했습니다.");
    load();
  });
}

async function updateStatus(id, status) {
  const { error } = await supabase
    .from("suggestions")
    .update({ status })
    .eq("id", id);

  if (error) return alert("상태를 변경하지 못했습니다.");
  toast("처리 상태를 변경했습니다.");
  await load();
  const row = rows.find(r => r.id === id);
  if (row) showDetail(row);
}

["suggestSearch","statusFilter","suggestCategory"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderList);
  document.getElementById(id).addEventListener("change", renderList);
});

load();
