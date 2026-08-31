import { supabase, requireAdmin, bindLogout, POST_CATEGORIES, esc, toast } from "./admin-common.js";

const auth = await requireAdmin();
bindLogout();

const params = new URLSearchParams(location.search);
const editId = params.get("id");

const category = document.getElementById("category");
Object.entries(POST_CATEGORIES).forEach(([value,label]) => {
  category.insertAdjacentHTML("beforeend", `<option value="${value}">${label}</option>`);
});

let existingCover = null;
let existingImages = [];

function safeFileName(name) {
  const ext = name.includes(".") ? "." + name.split(".").pop().toLowerCase() : "";
  return `${crypto.randomUUID()}${ext}`;
}

async function uploadFile(file) {
  if (!file) return null;
  if (file.size > 8 * 1024 * 1024) {
    throw new Error(`${file.name}: 8MB 이하의 이미지를 사용해 주세요.`);
  }

  const year = new Date().getFullYear();
  const path = `${auth.session.user.id}/${year}/${safeFileName(file.name)}`;

  const { error } = await supabase
    .storage
    .from("post-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return data.publicUrl;
}

function renderExistingImages() {
  document.getElementById("existingImages").innerHTML =
    existingImages.map((url,i) => `<span class="image-chip">추가사진 ${i+1}</span>`).join("");
}

if (editId) {
  document.getElementById("writeHeading").textContent = "게시글 수정";

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", editId)
    .single();

  if (error || !data) {
    alert("게시글을 불러올 수 없습니다.");
    location.href = "posts.html";
    throw new Error("Load failed");
  }

  category.value = data.category;
  document.getElementById("title").value = data.title || "";
  document.getElementById("excerpt").value = data.excerpt || "";
  document.getElementById("content").value = data.content || "";
  document.getElementById("isPublished").checked = !!data.is_published;

  if (data.published_at) {
    const d = new Date(data.published_at);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById("publishedAt").value = d.toISOString().slice(0,16);
  }

  existingCover = data.cover_url;
  existingImages = Array.isArray(data.images) ? data.images : [];

  if (existingCover) {
    const preview = document.getElementById("coverPreview");
    preview.src = existingCover;
    preview.hidden = false;
  }
  renderExistingImages();
}

document.getElementById("coverFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById("coverPreview");
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "저장 중...";

  try {
    const coverFile = document.getElementById("coverFile").files[0];
    const galleryFiles = [...document.getElementById("galleryFiles").files];

    if (galleryFiles.length > 10) {
      throw new Error("추가 사진은 한 번에 10장 이하로 올려주세요.");
    }

    let coverUrl = existingCover;
    if (coverFile) coverUrl = await uploadFile(coverFile);

    const uploadedImages = [];
    for (const file of galleryFiles) {
      uploadedImages.push(await uploadFile(file));
    }

    const published = document.getElementById("isPublished").checked;
    const dateValue = document.getElementById("publishedAt").value;

    const payload = {
      category: category.value,
      title: document.getElementById("title").value.trim(),
      excerpt: document.getElementById("excerpt").value.trim() || null,
      content: document.getElementById("content").value.trim(),
      cover_url: coverUrl,
      images: [...existingImages, ...uploadedImages],
      is_published: published,
      published_at: published
        ? (dateValue ? new Date(dateValue).toISOString() : new Date().toISOString())
        : null,
      author_id: auth.session.user.id,
      updated_at: new Date().toISOString()
    };

    if (!payload.category || !payload.title || !payload.content) {
      throw new Error("카테고리, 제목, 본문을 입력해 주세요.");
    }

    let error;
    if (editId) {
      ({ error } = await supabase.from("posts").update(payload).eq("id", editId));
    } else {
      payload.created_at = new Date().toISOString();
      ({ error } = await supabase.from("posts").insert(payload));
    }

    if (error) throw error;

    toast("게시글을 저장했습니다.");
    setTimeout(() => location.href = "posts.html", 700);

  } catch (err) {
    console.error(err);
    alert(err.message || "저장 중 오류가 발생했습니다.");
    saveBtn.disabled = false;
    saveBtn.textContent = "게시글 저장";
  }
});
