import {
  supabase,
  requireAdmin,
  bindLogout,
  esc,
  fmtDate,
  toast
} from "./admin-common.js";

const { session } = await requireAdmin();
bindLogout();

const form = document.getElementById("courseForm");
const listRoot = document.getElementById("courseAdminList");
const filterEl = document.getElementById("courseFilter");

let rows = [];


function todayLocal() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).formatToParts(now);

  const map = Object.fromEntries(
    parts.map(part => [
      part.type,
      part.value
    ])
  );

  return `${map.year}-${map.month}-${map.day}`;
}


function isEnded(row) {
  return Boolean(
    row.end_date &&
    row.end_date < todayLocal()
  );
}


function statusInfo(row) {

  if (isEnded(row)) {
    return {
      key: "ended",
      label: "기간종료",
      className: "gray"
    };
  }

  if (row.is_recruiting) {
    return {
      key: "recruiting",
      label: "모집중",
      className: "green"
    };
  }

  return {
    key: "closed",
    label: "모집종료",
    className: "orange"
  };
}


function periodText(row) {

  if (!row.start_date && !row.end_date) {
    return "교육기간 미입력";
  }

  if (row.start_date && row.end_date) {
    return `${row.start_date} ~ ${row.end_date}`;
  }

  if (row.start_date) {
    return `${row.start_date} 시작`;
  }

  return `${row.end_date} 종료`;
}


function resetForm() {

  form.reset();

  document.getElementById("courseId")
    .value = "";

  document.getElementById("supportType")
    .value = "국민내일배움카드";

  document.getElementById("displayOrder")
    .value = "0";

  document.getElementById("detailUrl")
    .value = "국민내일배움카드/courses.html";

  document.getElementById("isRecruiting")
    .checked = true;

  document.getElementById("courseFormTitle")
    .textContent = "새 과정 등록";

  document.getElementById("saveCourseBtn")
    .textContent = "과정 저장";
}


function fillForm(row) {

  document.getElementById("courseId")
    .value = row.id;

  document.getElementById("courseTitle")
    .value = row.title || "";

  document.getElementById("supportType")
    .value = row.support_type || "국민내일배움카드";

  document.getElementById("displayOrder")
    .value = row.display_order ?? 0;

  document.getElementById("startDate")
    .value = row.start_date || "";

  document.getElementById("endDate")
    .value = row.end_date || "";

  document.getElementById("scheduleText")
    .value = row.schedule_text || "";

  document.getElementById("courseSummary")
    .value = row.summary || "";

  document.getElementById("work24Url")
    .value = row.work24_url || "";

  document.getElementById("detailUrl")
    .value = row.detail_url || "";

  document.getElementById("isRecruiting")
    .checked = Boolean(row.is_recruiting);

  document.getElementById("courseFormTitle")
    .textContent = "과정 수정";

  document.getElementById("saveCourseBtn")
    .textContent = "수정 저장";

  document.getElementById("courseTitle")
    .focus();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function filteredRows() {

  const filter = filterEl.value;

  if (!filter) {
    return rows;
  }

  return rows.filter(
    row =>
      statusInfo(row).key === filter
  );
}


function renderList() {

  const filtered = filteredRows();

  if (!filtered.length) {
    listRoot.innerHTML =
      '<div class="empty">등록된 과정이 없습니다.</div>';
    return;
  }

  listRoot.innerHTML =
    filtered.map(row => {

      const status = statusInfo(row);

      return `
        <article class="course-admin-item">

          <div class="course-admin-item-top">

            <div>
              <span class="badge purple">
                ${esc(row.support_type)}
              </span>

              <span class="badge ${status.className}">
                ${status.label}
              </span>
            </div>

            <span class="course-order">
              순서 ${row.display_order ?? 0}
            </span>

          </div>

          <h4>
            ${esc(row.title)}
          </h4>

          <p class="course-admin-period">
            ${esc(periodText(row))}
            ${
              row.schedule_text
                ? ` · ${esc(row.schedule_text)}`
                : ""
            }
          </p>

          ${
            row.summary
              ? `
                <p class="course-admin-summary">
                  ${esc(row.summary)}
                </p>
              `
              : ""
          }

          <div class="course-admin-link-state">

            ${
              row.work24_url
                ? '<span class="badge green">고용24 링크 있음</span>'
                : '<span class="badge gray">고용24 링크 없음</span>'
            }

          </div>

          <div class="course-admin-actions">

            <button
              class="a-btn a-soft"
              type="button"
              data-edit="${row.id}"
            >
              수정
            </button>

            <button
              class="a-btn a-neutral"
              type="button"
              data-toggle="${row.id}"
            >
              ${
                row.is_recruiting
                  ? "모집 종료"
                  : "다시 모집"
              }
            </button>

            ${
              row.work24_url
                ? `
                  <a
                    class="a-btn a-neutral"
                    href="${esc(row.work24_url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    고용24 확인
                  </a>
                `
                : ""
            }

            <button
              class="a-btn a-danger"
              type="button"
              data-delete="${row.id}"
            >
              삭제
            </button>

          </div>

        </article>
      `;

    }).join("");


  listRoot
    .querySelectorAll("[data-edit]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const row = rows.find(
            item =>
              item.id === button.dataset.edit
          );

          if (row) fillForm(row);
        }
      );

    });


  listRoot
    .querySelectorAll("[data-toggle]")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const row = rows.find(
            item =>
              item.id === button.dataset.toggle
          );

          if (!row) return;

          const { error } = await supabase
            .from("recruiting_courses")
            .update({
              is_recruiting:
                !row.is_recruiting,

              updated_at:
                new Date().toISOString()
            })
            .eq("id", row.id);

          if (error) {
            console.error(error);
            alert("모집 상태를 변경하지 못했습니다.");
            return;
          }

          toast(
            row.is_recruiting
              ? "모집종료로 변경했습니다."
              : "다시 모집중으로 변경했습니다."
          );

          await load();
        }
      );

    });


  listRoot
    .querySelectorAll("[data-delete]")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const row = rows.find(
            item =>
              item.id === button.dataset.delete
          );

          if (!row) return;

          const ok = confirm(
            `"${row.title}" 과정을 삭제하시겠습니까?`
          );

          if (!ok) return;

          const { error } = await supabase
            .from("recruiting_courses")
            .delete()
            .eq("id", row.id);

          if (error) {
            console.error(error);
            alert("과정을 삭제하지 못했습니다.");
            return;
          }

          toast("과정을 삭제했습니다.");

          resetForm();
          await load();
        }
      );

    });
}


async function load() {

  listRoot.innerHTML =
    '<div class="empty">불러오는 중...</div>';

  const { data, error } = await supabase
    .from("recruiting_courses")
    .select("*")
    .order(
      "display_order",
      { ascending: true }
    )
    .order(
      "start_date",
      {
        ascending: true,
        nullsFirst: false
      }
    )
    .order(
      "created_at",
      { ascending: false }
    );

  if (error) {
    console.error(error);

    listRoot.innerHTML =
      '<div class="empty">과정 목록을 불러오지 못했습니다.</div>';

    return;
  }

  rows = data || [];
  renderList();
}


form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const id =
      document.getElementById("courseId")
        .value
        .trim();

    const title =
      document.getElementById("courseTitle")
        .value
        .trim();

    const supportType =
      document.getElementById("supportType")
        .value
        .trim();

    const startDate =
      document.getElementById("startDate")
        .value || null;

    const endDate =
      document.getElementById("endDate")
        .value || null;

    const scheduleText =
      document.getElementById("scheduleText")
        .value
        .trim() || null;

    const summary =
      document.getElementById("courseSummary")
        .value
        .trim() || null;

    const work24Url =
      document.getElementById("work24Url")
        .value
        .trim() || null;

    const detailUrl =
      document.getElementById("detailUrl")
        .value
        .trim() || null;

    const isRecruiting =
      document.getElementById("isRecruiting")
        .checked;

    const displayOrder =
      Number(
        document.getElementById("displayOrder")
          .value || 0
      );


    if (!title || !supportType) {
      alert("과정명과 지원구분을 확인해 주세요.");
      return;
    }


    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      alert("교육 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }


    if (
      work24Url &&
      !/^https?:\/\//i.test(work24Url)
    ) {
      alert("고용24 링크는 https:// 로 시작하는 전체 주소를 입력해 주세요.");
      return;
    }


    const payload = {
      title,
      support_type: supportType,
      start_date: startDate,
      end_date: endDate,
      schedule_text: scheduleText,
      summary,
      work24_url: work24Url,
      detail_url: detailUrl,
      is_recruiting: isRecruiting,
      display_order:
        Number.isFinite(displayOrder)
          ? displayOrder
          : 0,
      updated_at:
        new Date().toISOString()
    };


    const saveBtn =
      document.getElementById("saveCourseBtn");

    saveBtn.disabled = true;
    saveBtn.textContent =
      id ? "수정 중..." : "저장 중...";


    let error;


    if (id) {

      ({ error } = await supabase
        .from("recruiting_courses")
        .update(payload)
        .eq("id", id));

    } else {

      ({ error } = await supabase
        .from("recruiting_courses")
        .insert({
          ...payload,
          author_id:
            session.user.id
        }));

    }


    saveBtn.disabled = false;


    if (error) {
      console.error(error);

      alert(
        id
          ? "과정 수정 중 오류가 발생했습니다."
          : "과정 등록 중 오류가 발생했습니다."
      );

      saveBtn.textContent =
        id ? "수정 저장" : "과정 저장";

      return;
    }


    toast(
      id
        ? "과정을 수정했습니다."
        : "새 과정을 등록했습니다."
    );

    resetForm();
    await load();
  }
);


document.getElementById("newCourseBtn")
  .addEventListener(
    "click",
    () => {
      resetForm();

      document.getElementById("courseTitle")
        .focus();
    }
  );


document.getElementById("resetCourseBtn")
  .addEventListener(
    "click",
    resetForm
  );


filterEl.addEventListener(
  "change",
  renderList
);


resetForm();
load();
