import { supabase, requireAdmin, bindLogout, POST_CATEGORIES, SUGGESTION_STATUS, esc, fmtDate } from "./admin-common.js";

await requireAdmin();
bindLogout();

async function count(table, filter) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) console.error(error);
  return count ?? 0;
}

document.getElementById("statPosts").textContent = await count("posts");
document.getElementById("statPublished").textContent = await count("posts", q => q.eq("is_published", true));
document.getElementById("statSuggestions").textContent = await count("suggestions");
document.getElementById("statNewSuggestions").textContent = await count("suggestions", q => q.eq("status", "new"));

const { data: posts } = await supabase
  .from("posts")
  .select("id,category,title,is_published,created_at")
  .order("created_at", { ascending: false })
  .limit(5);

document.getElementById("recentPosts").innerHTML = posts?.length ? `
<table class="admin-table"><tbody>
${posts.map(p => `<tr>
  <td><span class="badge">${esc(POST_CATEGORIES[p.category] || p.category)}</span></td>
  <td class="title-cell"><a href="write.html?id=${p.id}">${esc(p.title)}</a></td>
  <td>${p.is_published ? '<span class="badge green">공개</span>' : '<span class="badge gray">임시저장</span>'}</td>
</tr>`).join("")}
</tbody></table>` : '<div class="empty">등록된 게시글이 없습니다.</div>';

const { data: suggestions } = await supabase
  .from("suggestions")
  .select("id,category,title,status,created_at")
  .order("created_at", { ascending: false })
  .limit(5);

document.getElementById("recentSuggestions").innerHTML = suggestions?.length ? `
<div class="suggestion-list">
${suggestions.map(s => `<a class="suggestion-item" href="suggestions.html?id=${s.id}">
  <div class="suggestion-item-top">
    <span class="badge purple">${esc(s.category)}</span>
    <span class="badge ${s.status==='done'?'green':s.status==='reviewing'?'orange':''}">${esc(SUGGESTION_STATUS[s.status])}</span>
  </div>
  <h4>${esc(s.title)}</h4>
  <p>${fmtDate(s.created_at, true)}</p>
</a>`).join("")}
</div>` : '<div class="empty">접수된 건의가 없습니다.</div>';
