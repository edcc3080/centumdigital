import {
  supabase,
  requireAdmin,
  bindLogout,
  esc,
  toast
} from "./admin-common.js";

import {
  COURSE_CATALOG,
  COURSE_MAP
} from "../assets/course-catalog.js";


const { session } = await requireAdmin();
bindLogout();


const form = document.getElementById("courseForm");
const listRoot = document.getElementById("courseAdminList");
const statusFilter = document.getElementById("courseFilter");
const typeFilter = document.getElementById("courseTypeFilter");
const courseKeySelect = document.getElementById("courseKey");
const titleInput = document.getElementById("courseTitle");
const customTitleWrap = document.getElementById("customTitleWrap");

let rows = [];


function buildCourseOptions() {

  COURSE_CATALOG.forEach(course => {

    const option = document.createElement("option");
    option.value = course.key;
    option.textContent =
      course.key === "other"
        ? "기타"
        : course.title;

    courseKeySelect.appendChild(option);


    const filterOption = document.createElement("option");
    filterOption.value = course.key;
    filterOption.textContent =
      course.key === "other"
        ? "기타 과정"
        : course.shortLabel;

    typeFilter.appendChild(filterOption);
  });
}


function todayLocal() {

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    )
    .formatToParts(new Date());

  const map =
    Object.fromEntries(
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


function selectedCourse() {
  return COURSE_MAP[courseKeySelect.value] || null;
}


function syncTitleField() {

  const course = selectedCourse();

  if (!course) {
    customTitleWrap.hidden = true;
    titleInput.required = false;
    titleInput.value = "";
    return;
  }

  const isOther =
    course.key === "other";

  customTitleWrap.hidden = !isOther;
  titleInput.required = isOther;

  if (!isOther) {
    titleInput.value = course.title;
  } else if (
    titleInput.value === COURSE_MAP.other.title
  ) {
    titleInput.value = "";
  }
}


function resetForm() {

  form.reset();

  document.getElementById("courseId")
    .value = "";

  document.getElementById("displayOrder")
    .value = "0";

  document.getElementById("isRecruiting")
    .checked = true;

  document.getElementById("courseFormTitle")
    .textContent = "새 회차 등록";

  document.getElementById("saveCourseBtn")
    .textContent = "회차 저장";

  customTitleWrap.hidden = true;
  titleInput.required = false;
  titleInput.value = "";
}


function fillForm(row) {

  document.getElementById("courseId")
    .value = row.id;

  courseKeySelect.value =
    row.course_key || "other";

  syncTitleField();

  if (
    (row.course_key || "other") === "other"
  ) {
    titleInput.value = row.title || "";
  }

  document.getElementById("roundLabel")
    .value = row.round_label || "";

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

  document.getElementById("isRecruiting")
    .checked = Boolean(row.is_recruiting);

  document.getElementById("courseFormTitle")
    .textContent = "회차 수정";

  document.getElementById("saveCourseBtn")
    .textContent = "수정 저장";

  courseKeySelect.focus();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function filteredRows() {

  const status = statusFilter.value;
  const courseKey = typeFilter.value;

  return rows.filter(row => {

    const matchStatus =
      !status ||
      statusInfo(row).key === status;

    const matchCourse =
      !courseKey ||
      row.course_key === courseKey;

    return matchStatus && matchCourse;
  });
}


function renderList() {

  const filtered = filteredRows();

  if (!filtered.length) {
    listRoot.innerHTML =
      '<div class="empty">등록된 회차가 없습니다.</div>';
    return;
  }

  listRoot.innerHTML =
    filtered.map(row => {

      const status = statusInfo(row);
      const course =
        COURSE_MAP[row.course_key] ||
        COURSE_MAP.other;

      return `
        <article class="course-admin-item">

          <div class="course-admin-item-top">

            <div>
              <span class="badge purple">
                ${esc(
                  row.course_key === "other"
                    ? "기타"
                    : course.shortLabel
                )}
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


          ${
            row.round_label
              ? `
                <div class="course-round-label">
                  ${esc(row.round_label)}
                </div>
              `
              : ""
          }


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

          const row =
            rows.find(
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

          const row =
            rows.find(
              item =>
                item.id === button.dataset.toggle
            );

          if (!row) return;

          const { error } =
            await supabase
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

          const row =
            rows.find(
              item =>
                item.id === button.dataset.delete
            );

          if (!row) return;

          const ok =
            confirm(
              `"${row.title}" ${row.round_label || "회차"}를 삭제하시겠습니까?`
            );

          if (!ok) return;

          const { error } =
            await supabase
              .from("recruiting_courses")
              .delete()
              .eq("id", row.id);

          if (error) {
            console.error(error);
            alert("회차를 삭제하지 못했습니다.");
            return;
          }

          toast("회차를 삭제했습니다.");

          resetForm();
          await load();
        }
      );

    });
}


async function load() {

  listRoot.innerHTML =
    '<div class="empty">불러오는 중...</div>';

  const { data, error } =
    await supabase
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
      '<div class="empty">회차 목록을 불러오지 못했습니다.</div>';

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

    const courseKey =
      courseKeySelect.value;

    const course =
      COURSE_MAP[courseKey];

    if (!course) {
      alert("과정을 선택해 주세요.");
      return;
    }


    let title =
      courseKey === "other"
        ? titleInput.value.trim()
        : course.title;


    if (!title) {
      alert("기타 과정명을 입력해 주세요.");
      return;
    }


    const roundLabel =
      document.getElementById("roundLabel")
        .value
        .trim() || null;

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

    const isRecruiting =
      document.getElementById("isRecruiting")
        .checked;

    const displayOrder =
      Number(
        document.getElementById("displayOrder")
          .value || 0
      );


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


    const detailUrl =
      `국민내일배움카드/course-detail.html?course=${encodeURIComponent(courseKey)}`;


    const payload = {
      course_key: courseKey,
      title,
      round_label: roundLabel,
      support_type: "국민내일배움카드",
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

      ({ error } =
        await supabase
          .from("recruiting_courses")
          .update(payload)
          .eq("id", id));

    } else {

      ({ error } =
        await supabase
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
          ? "회차 수정 중 오류가 발생했습니다."
          : "회차 등록 중 오류가 발생했습니다."
      );

      saveBtn.textContent =
        id ? "수정 저장" : "회차 저장";

      return;
    }


    toast(
      id
        ? "회차를 수정했습니다."
        : "새 회차를 등록했습니다."
    );

    resetForm();
    await load();
  }
);


courseKeySelect.addEventListener(
  "change",
  syncTitleField
);


document.getElementById("newCourseBtn")
  .addEventListener(
    "click",
    () => {
      resetForm();
      courseKeySelect.focus();
    }
  );


document.getElementById("resetCourseBtn")
  .addEventListener(
    "click",
    resetForm
  );


statusFilter.addEventListener(
  "change",
  renderList
);


typeFilter.addEventListener(
  "change",
  renderList
);


buildCourseOptions();
resetForm();
load();
