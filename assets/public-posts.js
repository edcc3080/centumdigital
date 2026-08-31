import { supabase, isSupabaseConfigured } from "./supabase-config.js";

const CATEGORY_LABELS = {
  notice: "공지",
  open: "개강",
  recruit: "모집",
  schedule: "일정",
  data: "자료",
  review: "수강후기",
  work: "수강생 작품",
  job: "취업·창업",
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

function fmtDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function emptyHTML(message = "등록된 글이 없습니다.") {
  return `
    <div class="empty-state">
      <div class="big">📝</div>
      <h3>${esc(message)}</h3>
      <p>관리자 페이지에서 새 글을 등록하면 이곳에 자동으로 표시됩니다.</p>
    </div>
  `;
}

function cardHTML(row, detailPath) {
  const image = row.cover_url
    ? `<div class="post-card-image"><img src="${esc(row.cover_url)}" alt=""></div>`
    : `<div class="post-card-image post-card-placeholder">✦</div>`;

  return `
    <a class="post-public-card" href="${detailPath}?id=${encodeURIComponent(row.id)}">
      ${image}
      <div class="post-public-body">
        <div class="post-public-meta">
          <span>${esc(CATEGORY_LABELS[row.category] || row.category)}</span>
          <time>${fmtDate(row.published_at || row.created_at)}</time>
        </div>
        <h3>${esc(row.title)}</h3>
        <p>${esc(row.excerpt || "내용을 확인해 보세요.")}</p>
      </div>
    </a>
  `;
}

function boardHTML(rows, detailPath) {
  return `
    <div class="board-wrap">
      <div class="board-row head">
        <span>구분</span><span>제목</span><span>등록일</span>
      </div>
      ${rows.map(row => `
        <a class="board-row public-board-link"
           href="${detailPath}?id=${encodeURIComponent(row.id)}">
          <span class="tag">${esc(CATEGORY_LABELS[row.category] || row.category)}</span>
          <span class="subject">${esc(row.title)}</span>
          <span class="date">${fmtDate(row.published_at || row.created_at)}</span>
        </a>
      `).join("")}
    </div>
  `;
}

async function loadContainer(container) {
  if (!isSupabaseConfigured) {
    container.innerHTML = emptyHTML("Supabase 연결 전입니다.");
    return;
  }

  const categories = (container.dataset.categories || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  const view = container.dataset.view || "cards";
  const detailPath = container.dataset.detail || "../post.html";
  const limit = Number(container.dataset.limit || 50);

  let query = supabase
    .from("posts")
    .select("id, category, title, excerpt, cover_url, published_at, created_at")
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(limit);

  if (categories.length) {
    query = query.in("category", categories);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    container.innerHTML = emptyHTML("게시글을 불러오지 못했습니다.");
    return;
  }

  if (!data?.length) {
    container.innerHTML = emptyHTML();
    return;
  }

  if (view === "board") {
    container.innerHTML = boardHTML(data, detailPath);
  } else {
    container.innerHTML = `
      <div class="post-public-grid">
        ${data.map(row => cardHTML(row, detailPath)).join("")}
      </div>
    `;
  }
}

document.querySelectorAll("[data-post-list]").forEach(loadContainer);
