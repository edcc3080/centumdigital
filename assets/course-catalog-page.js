import {
  supabase,
  isSupabaseConfigured
} from "./supabase-config.js";

import {
  COURSE_CATALOG,
  courseDetailHrefFromSubpage
} from "./course-catalog.js";


const root =
  document.getElementById("courseCatalogGrid");


function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


async function load() {

  let counts = {};


  if (isSupabaseConfigured) {

    const { data, error } =
      await supabase
        .from("recruiting_courses")
        .select("course_key")
        .eq("is_recruiting", true);


    if (!error && data) {

      counts =
        data.reduce(
          (acc, row) => {

            const key =
              row.course_key || "other";

            acc[key] =
              (acc[key] || 0) + 1;

            return acc;
          },
          {}
        );
    }
  }


  root.innerHTML =
    COURSE_CATALOG.map(course => {

      const count =
        counts[course.key] || 0;

      return `
        <a
          class="training-catalog-card"
          href="${courseDetailHrefFromSubpage(course.key)}"
        >

          <div class="training-catalog-top">

            <div class="training-catalog-icon">
              ${course.icon}
            </div>

            ${
              count > 0
                ? `
                  <span class="training-recruit-badge">
                    현재 ${count}개 회차 모집중
                  </span>
                `
                : `
                  <span class="training-recruit-badge muted">
                    현재 모집 회차 없음
                  </span>
                `
            }

          </div>


          <small>
            ${escapeHTML(course.category)}
          </small>


          <h3>
            ${escapeHTML(course.title)}
          </h3>


          <p>
            ${escapeHTML(course.intro)}
          </p>


          <span class="training-card-more">
            과정 상세보기 →
          </span>

        </a>
      `;

    }).join("");
}


load();
