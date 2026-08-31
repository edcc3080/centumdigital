import { supabase, isSupabaseConfigured } from "./supabase-config.js";

const root = document.getElementById("postDetail");

const LABELS = {
  notice: "공지사항",
  open: "개강 안내",
  recruit: "모집중인 과정",
  schedule: "교육 일정",
  data: "자료실",
  review: "수강생 후기",
  work: "수강생 작품",
  job: "취업 · 창업 이야기",
  gallery: "포토갤러리"
};

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(value));
}

async function run() {
  if (!root) return;

  if (!isSupabaseConfigured) {
    root.innerHTML = `<div class="empty-state"><h3>Supabase 연결 전입니다.</h3></div>`;
    return;
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = `<div class="empty-state"><h3>게시글 번호가 없습니다.</h3></div>`;
    return;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .single();

  if (error || !data) {
    console.error(error);
    root.innerHTML = `<div class="empty-state"><h3>게시글을 찾을 수 없습니다.</h3></div>`;
    return;
  }

  document.title = `${data.title} | 센텀디지털캠프 평생교육원`;

  const images = Array.isArray(data.images) ? data.images : [];
  const text = esc(data.content || "").replace(/\n/g, "<br>");

  root.innerHTML = `
    <article class="post-detail-article">
      <div class="post-detail-meta">
        <span>${esc(LABELS[data.category] || data.category)}</span>
        <time>${fmt(data.published_at || data.created_at)}</time>
      </div>
      <h1>${esc(data.title)}</h1>
      ${data.excerpt ? `<p class="post-detail-excerpt">${esc(data.excerpt)}</p>` : ""}
      ${data.cover_url ? `<img class="post-detail-cover" src="${esc(data.cover_url)}" alt="">` : ""}
      <div class="post-detail-content">${text}</div>
      ${images.length ? `
        <div class="post-detail-gallery">
          ${images.map(url => `<img src="${esc(url)}" alt="">`).join("")}
        </div>` : ""}
      <div class="post-back-row">
        <a class="btn btn-neutral" href="javascript:history.back()">← 목록으로</a>
      </div>
    </article>
  `;
}

run();
