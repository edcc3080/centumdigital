import {
  supabase,
  requireAdmin,
  bindLogout,
  CONSULTATION_STATUS,
  esc,
  fmtDate,
  toast
} from "./admin-common.js";

await requireAdmin();
bindLogout();

let rows = [];
let selectedId =
  new URLSearchParams(location.search).get("id");

function badgeClass(status) {
  if (status === "done") return "green";
  if (status === "contacting") return "orange";
  return "";
}

async function load() {

  const { data, error } = await supabase
    .from("consultations")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);

    document.getElementById("consultList")
      .innerHTML =
        '<div class="empty">상담을 불러오지 못했습니다.</div>';

    return;
  }

  rows = data || [];

  renderStats();
  renderList();

  if (selectedId) {
    const row = rows.find(
      item => item.id === selectedId
    );

    if (row) showDetail(row);
  }
}


function renderStats() {

  document.getElementById("consultAll")
    .textContent = rows.length;

  document.getElementById("consultNew")
    .textContent =
      rows.filter(
        row => row.status === "new"
      ).length;

  document.getElementById("consultContacting")
    .textContent =
      rows.filter(
        row => row.status === "contacting"
      ).length;

  document.getElementById("consultDone")
    .textContent =
      rows.filter(
        row => row.status === "done"
      ).length;
}


function filteredRows() {

  const text =
    document.getElementById("consultSearch")
      .value
      .trim()
      .toLowerCase();

  const status =
    document.getElementById("consultStatus")
      .value;

  return rows.filter(row => {

    const haystack = `
      ${row.name}
      ${row.phone}
      ${row.interest}
      ${row.contact_method}
      ${row.message || ""}
    `.toLowerCase();

    const matchText =
      !text || haystack.includes(text);

    const matchStatus =
      !status || row.status === status;

    return matchText && matchStatus;
  });
}


function renderList() {

  const filtered = filteredRows();
  const root =
    document.getElementById("consultList");

  if (!filtered.length) {
    root.innerHTML =
      '<div class="empty">조건에 맞는 상담이 없습니다.</div>';
    return;
  }

  root.innerHTML =
    filtered.map(row => `

      <div
        class="suggestion-item"
        data-id="${row.id}"
      >

        <div class="suggestion-item-top">

          <span class="badge purple">
            ${esc(row.interest)}
          </span>

          <span class="badge ${badgeClass(row.status)}">
            ${esc(
              CONSULTATION_STATUS[row.status] ||
              row.status
            )}
          </span>

        </div>

        <h4>
          ${esc(row.name)} · ${esc(row.phone)}
        </h4>

        <p>
          ${esc(
            row.message ||
            row.contact_method ||
            "상담 요청"
          )}
        </p>

      </div>

    `).join("");

  root
    .querySelectorAll(".suggestion-item")
    .forEach(element => {

      element.addEventListener(
        "click",
        () => {

          selectedId = element.dataset.id;

          const row = rows.find(
            item =>
              item.id === selectedId
          );

          if (row) showDetail(row);
        }
      );

    });
}


function showDetail(row) {

  const root =
    document.getElementById("consultDetail");

  root.innerHTML = `

    <div class="detail-box">

      <div class="detail-meta">

        <span class="badge purple">
          ${esc(row.interest)}
        </span>

        <span class="badge ${badgeClass(row.status)}">
          ${esc(
            CONSULTATION_STATUS[row.status] ||
            row.status
          )}
        </span>

        <span class="badge gray">
          ${fmtDate(row.created_at, true)}
        </span>

      </div>


      <h3>
        ${esc(row.name)}님의 수강상담
      </h3>


      <p>
        <strong>연락처</strong><br>
        ${esc(row.phone)}
      </p>

      <p>
        <strong>관심 분야</strong><br>
        ${esc(row.interest)}
      </p>

      <p>
        <strong>희망 상담 방법</strong><br>
        ${esc(row.contact_method)}
      </p>


      <hr class="detail-divider">


      <p>
        <strong>상담 내용</strong>
      </p>

      <p>
        ${esc(
          row.message ||
          "별도 상담 내용이 없습니다."
        )}
      </p>


      <hr class="detail-divider">


      <div class="form-field">

        <label for="consultMemo">
          관리자 메모
        </label>

        <textarea
          id="consultMemo"
          class="consult-admin-memo"
          placeholder="통화 내용이나 후속 연락 내용을 기록해 주세요."
        >${esc(row.admin_memo || "")}</textarea>

      </div>


      <div class="form-actions">

        <a
          class="a-btn a-primary"
          href="tel:${esc(row.phone)}"
        >
          ☎ 전화 걸기
        </a>

        <button
          class="a-btn a-neutral"
          data-status="new"
        >
          새 상담
        </button>

        <button
          class="a-btn a-soft"
          data-status="contacting"
        >
          상담 중
        </button>

        <button
          class="a-btn a-primary"
          data-status="done"
        >
          상담 완료
        </button>

        <button
          class="a-btn a-neutral"
          id="saveConsultMemo"
        >
          메모 저장
        </button>

        <button
          class="a-btn a-danger"
          id="deleteConsult"
        >
          삭제
        </button>

      </div>

    </div>
  `;


  root
    .querySelectorAll("[data-status]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          updateStatus(
            row.id,
            button.dataset.status
          )
      );

    });


  document.getElementById("saveConsultMemo")
    .addEventListener(
      "click",
      async () => {

        const memo =
          document.getElementById("consultMemo")
            .value
            .trim();

        const { error } = await supabase
          .from("consultations")
          .update({
            admin_memo: memo || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", row.id);

        if (error) {
          console.error(error);
          alert("메모를 저장하지 못했습니다.");
          return;
        }

        toast("관리자 메모를 저장했습니다.");

        await load();

        const updated = rows.find(
          item => item.id === row.id
        );

        if (updated) showDetail(updated);
      }
    );


  document.getElementById("deleteConsult")
    .addEventListener(
      "click",
      async () => {

        const ok = confirm(
          "이 수강상담을 삭제하시겠습니까?"
        );

        if (!ok) return;

        const { error } = await supabase
          .from("consultations")
          .delete()
          .eq("id", row.id);

        if (error) {
          console.error(error);
          alert("상담을 삭제하지 못했습니다.");
          return;
        }

        selectedId = null;

        root.innerHTML =
          '<div class="empty">왼쪽에서 상담을 선택해 주세요.</div>';

        toast("상담을 삭제했습니다.");

        await load();
      }
    );
}


async function updateStatus(id, status) {

  const { error } = await supabase
    .from("consultations")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("상담 상태를 변경하지 못했습니다.");
    return;
  }

  toast("상담 상태를 변경했습니다.");

  await load();

  const updated = rows.find(
    item => item.id === id
  );

  if (updated) showDetail(updated);
}


document.getElementById("consultSearch")
  .addEventListener(
    "input",
    renderList
  );


document.getElementById("consultStatus")
  .addEventListener(
    "change",
    renderList
  );


load();
