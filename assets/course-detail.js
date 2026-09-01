import {
  supabase,
  isSupabaseConfigured
} from "./supabase-config.js";

import {
  COURSE_MAP,
  getCourse
} from "./course-catalog.js";


const params =
  new URLSearchParams(location.search);

let courseKey =
  params.get("course") || "other";

if (!COURSE_MAP[courseKey]) {
  courseKey = "other";
}

const roundId =
  params.get("round") || "";

let course =
  getCourse(courseKey);


function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatDate(value) {

  if (!value) return "";

  const parts =
    String(value).split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}


function periodText(row) {

  if (
    row.start_date &&
    row.end_date
  ) {
    return `${formatDate(row.start_date)} ~ ${formatDate(row.end_date)}`;
  }

  if (row.start_date) {
    return `${formatDate(row.start_date)} 시작`;
  }

  if (row.end_date) {
    return `${formatDate(row.end_date)}까지`;
  }

  return "교육기간 문의";
}


function renderDescription() {

  document.title =
    `${course.title} | 센텀디지털캠프 평생교육원`;

  document.getElementById("courseHeroBadge")
    .textContent = course.category;

  document.getElementById("courseHeroTitle")
    .textContent = course.title;

  document.getElementById("courseHeroIntro")
    .textContent = course.intro;

  document.getElementById("courseBreadcrumb")
    .textContent = course.shortLabel;

  document.getElementById("courseDetailCategory")
    .textContent = course.category;

  document.getElementById("courseDetailTitle")
    .textContent = course.title;

  document.getElementById("courseDetailOverview")
    .textContent = course.overview;

  document.getElementById("courseTargetList")
    .innerHTML =
      course.targets
        .map(item => `
          <li>${escapeHTML(item)}</li>
        `)
        .join("");

  document.getElementById("courseLearningList")
    .innerHTML =
      course.learnings
        .map(item => `
          <li>${escapeHTML(item)}</li>
        `)
        .join("");
}


async function resolveOtherCourse() {

  if (
    courseKey !== "other" ||
    !roundId ||
    !isSupabaseConfigured
  ) {
    return null;
  }


  const { data, error } =
    await supabase
      .from("recruiting_courses")
      .select(
        "id,title,course_key,summary"
      )
      .eq("id", roundId)
      .maybeSingle();


  if (error || !data) {
    return null;
  }


  course = {
    ...COURSE_MAP.other,
    title:
      data.title ||
      COURSE_MAP.other.title,
    shortLabel:
      data.title ||
      COURSE_MAP.other.shortLabel,
    intro:
      data.summary ||
      COURSE_MAP.other.intro,
    overview:
      data.summary ||
      COURSE_MAP.other.overview
  };


  return data;
}


async function loadRounds(selectedOtherRow = null) {

  const root =
    document.getElementById("courseRoundList");

  const countEl =
    document.getElementById("courseRoundCount");


  if (!isSupabaseConfigured) {

    root.innerHTML =
      '<div class="course-round-empty">모집 정보 서버 연결 전입니다.</div>';

    return;
  }


  let query =
    supabase
      .from("recruiting_courses")
      .select(
        "id,course_key,title,round_label,start_date,end_date,schedule_text,summary,work24_url,display_order"
      )
      .eq("is_recruiting", true);


  if (
    courseKey === "other" &&
    selectedOtherRow
  ) {
    query =
      query
        .eq("course_key", "other")
        .eq("title", selectedOtherRow.title);
  } else {
    query =
      query.eq(
        "course_key",
        courseKey
      );
  }


  const { data, error } =
    await query
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
      );


  if (error) {

    console.error(error);

    root.innerHTML =
      '<div class="course-round-empty">모집 회차를 불러오지 못했습니다.</div>';

    return;
  }


  const rows = data || [];

  countEl.textContent =
    String(rows.length);


  if (!rows.length) {

    root.innerHTML = `
      <div class="course-round-empty">

        <strong>
          현재 모집중인 회차가 없습니다.
        </strong>

        <p>
          다음 개강 일정은 교육원으로 문의해 주세요.
        </p>

        <a
          class="btn btn-primary"
          href="../수강상담/consult.html"
        >
          수강상담 신청
        </a>

      </div>
    `;

    return;
  }


  root.innerHTML =
    rows.map((row, index) => `

      <article class="course-round-card">

        <div class="course-round-card-top">

          <span class="course-round-status">
            모집중
          </span>

          <span class="course-round-number">
            ${
              escapeHTML(
                row.round_label ||
                `${index + 1}번째 모집 회차`
              )
            }
          </span>

        </div>


        <h3>
          ${escapeHTML(row.title)}
        </h3>


        <dl class="course-round-meta">

          <div>
            <dt>교육기간</dt>
            <dd>${escapeHTML(periodText(row))}</dd>
          </div>

          <div>
            <dt>교육시간</dt>
            <dd>
              ${escapeHTML(
                row.schedule_text ||
                "상세 일정 문의"
              )}
            </dd>
          </div>

        </dl>


        ${
          row.summary
            ? `
              <p class="course-round-summary">
                ${escapeHTML(row.summary)}
              </p>
            `
            : ""
        }


        <div class="course-round-actions">

          ${
            row.work24_url
              ? `
                <a
                  class="course-work24-btn"
                  href="${escapeHTML(row.work24_url)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  고용24 바로 신청
                </a>
              `
              : `
                <a
                  class="course-work24-btn muted"
                  href="../수강상담/consult.html"
                >
                  수강신청 문의
                </a>
              `
          }

        </div>

      </article>

    `).join("");
}


const selectedOtherRow =
  await resolveOtherCourse();

renderDescription();
await loadRounds(selectedOtherRow);
