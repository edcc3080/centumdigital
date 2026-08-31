-- ============================================================
-- 센텀디지털캠프 홈페이지 관리자 시스템
-- Supabase SQL Editor에서 전체 실행하세요.
-- ============================================================

-- 0. 관리자 권한용 private schema
create schema if not exists private;

-- 1. 관리자 계정 목록
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '관리자',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

drop policy if exists "admin can read own admin row" on public.admin_users;
create policy "admin can read own admin row"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

-- 관리자 여부를 안전하게 검사하는 함수
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;


-- 2. 게시글
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('notice','open','recruit','schedule','data','review','work','job','gallery')
  ),
  title text not null check (char_length(title) between 1 and 150),
  excerpt text check (excerpt is null or char_length(excerpt) <= 300),
  content text not null,
  cover_url text,
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  is_published boolean not null default false,
  published_at timestamptz,
  author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_category_idx on public.posts(category);
create index if not exists posts_published_idx on public.posts(is_published, published_at desc);
create index if not exists posts_author_idx on public.posts(author_id);

alter table public.posts enable row level security;

revoke all on table public.posts from anon, authenticated;
grant select on table public.posts to anon, authenticated;
grant insert, update, delete on table public.posts to authenticated;

drop policy if exists "public can read published posts" on public.posts;
create policy "public can read published posts"
on public.posts
for select
to anon, authenticated
using (
  is_published = true
  and published_at is not null
  and published_at <= now()
);

drop policy if exists "admins can read all posts" on public.posts;
create policy "admins can read all posts"
on public.posts
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "admins can insert posts" on public.posts;
create policy "admins can insert posts"
on public.posts
for insert
to authenticated
with check (
  (select private.is_admin())
  and author_id = (select auth.uid())
);

drop policy if exists "admins can update posts" on public.posts;
create policy "admins can update posts"
on public.posts
for update
to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and author_id = (select auth.uid())
);

drop policy if exists "admins can delete posts" on public.posts;
create policy "admins can delete posts"
on public.posts
for delete
to authenticated
using ((select private.is_admin()));


-- 3. 건의함
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  identity_type text not null default 'anonymous'
    check (identity_type in ('anonymous','named')),
  category text not null
    check (category in (
      '시설 · 환경',
      '국민내일배움카드 과정',
      '강사 · 수업',
      '교육과정 제안',
      '행정 · 상담',
      '홈페이지',
      '기타'
    )),
  name text check (name is null or char_length(name) <= 80),
  contact text check (contact is null or char_length(contact) <= 100),
  title text not null check (char_length(title) between 1 and 150),
  content text not null check (char_length(content) between 1 and 5000),
  status text not null default 'new'
    check (status in ('new','reviewing','done')),
  created_at timestamptz not null default now()
);

create index if not exists suggestions_status_idx on public.suggestions(status, created_at desc);
create index if not exists suggestions_category_idx on public.suggestions(category);

alter table public.suggestions enable row level security;

revoke all on table public.suggestions from anon, authenticated;

-- 일반 방문자는 필요한 칼럼만 INSERT 가능
grant insert (identity_type, category, name, contact, title, content)
on public.suggestions
to anon, authenticated;

-- 관리자만 조회/수정/삭제
grant select, update, delete on table public.suggestions to authenticated;

drop policy if exists "visitors can submit suggestions" on public.suggestions;
create policy "visitors can submit suggestions"
on public.suggestions
for insert
to anon, authenticated
with check (status = 'new');

drop policy if exists "admins can read suggestions" on public.suggestions;
create policy "admins can read suggestions"
on public.suggestions
for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "admins can update suggestions" on public.suggestions;
create policy "admins can update suggestions"
on public.suggestions
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "admins can delete suggestions" on public.suggestions;
create policy "admins can delete suggestions"
on public.suggestions
for delete
to authenticated
using ((select private.is_admin()));


-- 4. 게시글 이미지용 Storage Bucket
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'post-images',
  'post-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 기존에 같은 이름의 정책이 있으면 제거
drop policy if exists "admins can list post images" on storage.objects;
drop policy if exists "admins can upload post images" on storage.objects;
drop policy if exists "admins can update post images" on storage.objects;
drop policy if exists "admins can delete post images" on storage.objects;

create policy "admins can list post images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-images'
  and (select private.is_admin())
);

create policy "admins can upload post images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and (select private.is_admin())
);

create policy "admins can update post images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'post-images'
  and (select private.is_admin())
)
with check (
  bucket_id = 'post-images'
  and (select private.is_admin())
);

create policy "admins can delete post images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-images'
  and (select private.is_admin())
);

-- ============================================================
-- 중요: 관리자 Auth 사용자를 Dashboard에서 만든 뒤 아래 예시를
-- 실제 관리자 이메일로 바꾸어 한 번 실행하세요.
--
-- insert into public.admin_users (user_id, display_name)
-- select id, '센텀디지털캠프 관리자'
-- from auth.users
-- where email = 'admin@example.com'
-- on conflict (user_id) do nothing;
-- ============================================================
