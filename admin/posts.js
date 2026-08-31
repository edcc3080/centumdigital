import { supabase, requireAdmin, bindLogout, POST_CATEGORIES, esc, fmtDate, toast } from "./admin-common.js";

await requireAdmin();
bindLogout();

const categoryFilter = document.getElementById("categoryFilter");
Object.entries(POST_CATEGORIES).forEach(([value,label]) => {
  categoryFilter.insertAdjacentHTML("beforeend", `<option value="${value}">${label}</option>`);
});

let rows = [];

async function load() {
  const { data, error } = await supabase
    .from("posts")
    .select("id,category,title,is_published,published_at,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    document.getElementById("postsTable").innerHTML = '<div class="empty">게시글을 불러오지 못했습니다.</div>';
    return;
  }
  rows = data || [];
  render();
}

function render() {
  const text = document.getElementById("searchText").value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const pub = document.getElementById("publishFilter").value;

  const filtered = rows.filter(r =>
    (!text || r.title.toLowerCase().includes(text)) &&
    (!cat || r.category === cat) &&
    (!pub || String(r.is_published) === pub)
  );

  document.getElementById("postsTable").innerHTML = filtered.length ? `
  <table class="admin-table">
    <thead><tr><th>카테고리</th><th>제목</th><th>상태</th><th>등록일</th><th>관리</th></tr></thead>
    <tbody>
      ${filtered.map(r => `<tr>
        <td><span class="badge">${esc(POST_CATEGORIES[r.category] || r.category)}</span></td>
        <td class="title-cell">${esc(r.title)}</td>
        <td>${r.is_published ? '<span class="badge green">공개</span>' : '<span class="badge gray">임시저장</span>'}</td>
        <td>${fmtDate(r.published_at || r.created_at)}</td>
        <td>
          <a class="a-btn a-soft" href="write.html?id=${r.id}">수정</a>
          <button class="a-btn a-danger" data-delete="${r.id}">삭제</button>
        </td>
      </tr>`).join("")}
    </tbody>
  </table>` : '<div class="empty">조건에 맞는 게시글이 없습니다.</div>';

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
      const { error } = await supabase.from("posts").delete().eq("id", btn.dataset.delete);
      if (error) return alert("삭제하지 못했습니다.");
      toast("게시글을 삭제했습니다.");
      load();
    });
  });
}

["searchText","categoryFilter","publishFilter"].forEach(id => {
  document.getElementById(id).addEventListener("input", render);
  document.getElementById(id).addEventListener("change", render);
});

load();
