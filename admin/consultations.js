import {
  supabase,
  requireAdmin,
  bindLogout,
  esc,
  fmtDate,
  toast
} from "./admin-common.js";

await requireAdmin();
bindLogout();

const STATUS = {
  new: "새 상담",
  contacting: "상담 중",
  done: "상담 완료"
};

let rows = [];
let selectedId = new URLSearchParams(location.search).get("id");

async function load() {
  const { data, error } = await supabase
    .from("consultations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    document.getElementById("consultList").innerHTML =
      '<div class="empty">상담을 불러오지 못했습니다.</div>';
    return;
  }

  rows = data || [];
  renderStats();
  renderList();

  if (selectedId) {
    const row = rows.find(r => r.id === selectedId);
    if (row) showDetail(row);
  }
}

function renderStats() {
  document.getElementById("consultAll").textContent = rows.length;
  document.getElementById("consultNew").textContent =
    rows.filter(r => r.status === "new").length;
  document.getElementById("consultContacting").textContent =
    rows.filter(r => r.status === "contacting").length;
  document.getElementById("consultDone").textContent =
    rows.filter(r => r.status === "done").length;
}

function filteredRows() {
  const text = document.getElementById("consultSearch")
    .value.trim().toLowerCase();
  const status = document.getElementById("consultStatus").value;

  return rows.filter(r => {
    const haystack = `${r.name} ${r.phone} ${r.interest} ${r.message || ""}`
      .toLowerCase();

    return (!text || haystack.includes(text))
      && (!status || r.status === status);
  });
}

function statusBadge(status) {
  if (status === "done") return "green";
  if (status === "contacting") return "orange";
  return "";
}

function renderList() {
  const filtered = filteredRows();

  document.getElementById("consultList").innerHTML =
    filtered.length
    ? filtered.map(r => `
      <div class="suggestion-item" data-id="${r.id}">
        <div class="suggestion-item-top">
          <span class="badge purple">${esc(r.interest)}</span>
          <span class="badge ${statusBadge(r.status)}">
            ${esc(STATUS[r.status] || r.status)}
          </span>
        </div>
        <h4>${esc(r.name)} · ${esc(r.phone)}</h4>
        <p>${esc(r.message || r.contact_method || "상담 요청")}</p>
      </div>
    `).join("")
    : '<div class="empty">조건에 맞는 상담이 없습니다.</div>';

  document.querySelectorAll(".suggestion-item").forEach(el => {
    el.addEventListener("click", () => {
      selectedId = el.dataset.id;
      const row = rows.find(r => r.id === selectedId);
      if (row) showDetail(row);
    });
  });
}

function showDetail(r) {
  document.getElementById("consultDetail").innerHTML = `
    <div class="detail-box">

      <div class="detail-meta">
        <span class="badge purple">${esc(r.interest)}</span>
        <span class="badge ${statusBadge(r.status)}">
          ${esc(STATUS[r.status] || r.status)}
        </span>
        <span class="badge gray">${fmtDate(r.created_at, true)}</span>
      </div>

      <h3>${esc(r.name)}님의 수강상담</h3>

      <p><strong>연락처</strong> ${esc(r.phone)}</p>
      <p><strong>관심 분야</strong> ${esc(r.interest)}</p>
      <p><strong>희망 상담</strong> ${esc(r.contact_method)}</p>

      <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0">

      <p><strong>상담 내용</strong></p>
      <p>${esc(r.message || "별도 상담 내용 없음")}</p>

      <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0">

      <div class="form-field">
        <label for="consultMemo">관리자 메모</label>
        <textarea id="consultMemo"
          style="min-height:110px"
          placeholder="통화 내용이나 후속 연락 내용을 기록할 수 있습니다.">${esc(r.admin_memo || "")}</textarea>
      </div>

      <div class="form-actions">
        <a class="a-btn a-primary" href="tel:${esc(r.phone)}">☎ 전화 걸기</a>
        <button class="a-btn a-neutral" data-status="new">새 상담</button>
        <button class="a-btn a-soft" data-status="contacting">상담 중</button>
        <button class="a-btn a-primary" data-status="done">상담 완료</button>
        <button class="a-btn a-neutral" id="saveConsultMemo">메모 저장</button>
        <button class="a-btn a-danger" id="deleteConsult">삭제</button>
      </div>

      <div style="margin-top:16px;color:#64748b;font-size:12px;line-height:1.7">
        문자 알림:
        ${
          r.sms_sent
          ? '<span class="badge green">발송됨</span>'
          : r.sms_error
          ? '<span class="badge orange">발송 오류</span>'
          : '<span class="badge gray">확인 중</span>'
        }
      </div>

    </div>
  `;

  document.querySelectorAll("[data-status]").forEach(btn => {
    btn.addEventListener("click", () => updateStatus(r.id, btn.dataset.status));
  });

  document.getElementById("saveConsultMemo").addEventListener("click", async () => {
    const memo = document.getElementById("consultMemo").value.trim();

    const { error } = await supabase
      .from("consultations")
      .update({
        admin_memo: memo || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", r.id);

    if (error) return alert("메모를 저장하지 못했습니다.");
    toast("관리자 메모를 저장했습니다.");
    await load();
    const row = rows.find(x => x.id === r.id);
    if (row) showDetail(row);
  });

  document.getElementById("deleteConsult").addEventListener("click", async () => {
    if (!confirm("이 수강상담을 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("consultations")
      .delete()
      .eq("id", r.id);

    if (error) return alert("삭제하지 못했습니다.");

    selectedId = null;
    document.getElementById("consultDetail").innerHTML =
      '<div class="empty">왼쪽에서 상담을 선택해 주세요.</div>';

    toast("상담을 삭제했습니다.");
    load();
  });
}

async function updateStatus(id, status) {
  const { error } = await supabase
    .from("consultations")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) return alert("상담 상태를 변경하지 못했습니다.");

  toast("상담 상태를 변경했습니다.");
  await load();

  const row = rows.find(r => r.id === id);
  if (row) showDetail(row);
}

["consultSearch", "consultStatus"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderList);
  document.getElementById(id).addEventListener("change", renderList);
});

load();
