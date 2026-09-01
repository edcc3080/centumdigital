-- ============================================================
-- 센텀디지털캠프 홈페이지 전체 관리자 시스템
-- 게시글 + 건의함 + 수강상담
--
-- Supabase → SQL Editor → New Query
-- 이 파일 전체를 붙여넣고 Run 하세요.
--
-- 문자/SMS 기능은 전혀 없습니다.
-- ============================================================


-- ============================================================
-- 0. 관리자 권한용 private schema
-- ============================================================

create schema if not exists private;


-- ============================================================
-- 1. 관리자 계정 목록
-- ============================================================

create table if not exists public.admin_users (

  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  display_name text
    not null
    default '관리자',

  created_at timestamptz
    not null
    default now()
);


alter table public.admin_users
enable row level security;


revoke all
on table public.admin_users
from anon, authenticated;


grant select
on table public.admin_users
to authenticated;


drop policy if exists
"admin can read own admin row"
on public.admin_users;


create policy
"admin can read own admin row"
on public.admin_users
for select
to authenticated
using (
  (select auth.uid()) = user_id
);


-- 관리자 여부 확인 함수
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
    where au.user_id =
      (select auth.uid())

  );

$$;


revoke all
on function private.is_admin()
from public;


grant usage
on schema private
to authenticated;


grant execute
on function private.is_admin()
to authenticated;



-- ============================================================
-- 2. 홈페이지 게시글
-- ============================================================

create table if not exists public.posts (

  id uuid primary key
    default gen_random_uuid(),

  category text not null
    check (
      category in (
        'notice',
        'open',
        'recruit',
        'schedule',
        'data',
        'review',
        'work',
        'job',
        'gallery'
      )
    ),

  title text not null
    check (
      char_length(title)
      between 1 and 150
    ),

  excerpt text
    check (
      excerpt is null
      or char_length(excerpt) <= 300
    ),

  content text not null,

  cover_url text,

  images jsonb
    not null
    default '[]'::jsonb
    check (
      jsonb_typeof(images) = 'array'
    ),

  is_published boolean
    not null
    default false,

  published_at timestamptz,

  author_id uuid
    not null
    references auth.users(id),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index if not exists
posts_category_idx
on public.posts(category);


create index if not exists
posts_published_idx
on public.posts(
  is_published,
  published_at desc
);


create index if not exists
posts_author_idx
on public.posts(author_id);


alter table public.posts
enable row level security;


revoke all
on table public.posts
from anon, authenticated;


grant select
on table public.posts
to anon, authenticated;


grant insert, update, delete
on table public.posts
to authenticated;


drop policy if exists
"public can read published posts"
on public.posts;


create policy
"public can read published posts"
on public.posts
for select
to anon, authenticated
using (
  is_published = true
  and published_at is not null
  and published_at <= now()
);


drop policy if exists
"admins can read all posts"
on public.posts;


create policy
"admins can read all posts"
on public.posts
for select
to authenticated
using (
  (select private.is_admin())
);


drop policy if exists
"admins can insert posts"
on public.posts;


create policy
"admins can insert posts"
on public.posts
for insert
to authenticated
with check (
  (select private.is_admin())
  and author_id =
    (select auth.uid())
);


drop policy if exists
"admins can update posts"
on public.posts;


create policy
"admins can update posts"
on public.posts
for update
to authenticated
using (
  (select private.is_admin())
)
with check (
  (select private.is_admin())
  and author_id =
    (select auth.uid())
);


drop policy if exists
"admins can delete posts"
on public.posts;


create policy
"admins can delete posts"
on public.posts
for delete
to authenticated
using (
  (select private.is_admin())
);



-- ============================================================
-- 3. 건의함
-- ============================================================

create table if not exists public.suggestions (

  id uuid primary key
    default gen_random_uuid(),

  identity_type text
    not null
    default 'anonymous'
    check (
      identity_type
      in ('anonymous','named')
    ),

  category text
    not null
    check (
      category in (
        '시설 · 환경',
        '국민내일배움카드 과정',
        '강사 · 수업',
        '교육과정 제안',
        '행정 · 상담',
        '홈페이지',
        '기타'
      )
    ),

  name text
    check (
      name is null
      or char_length(name) <= 80
    ),

  contact text
    check (
      contact is null
      or char_length(contact) <= 100
    ),

  title text
    not null
    check (
      char_length(title)
      between 1 and 150
    ),

  content text
    not null
    check (
      char_length(content)
      between 1 and 5000
    ),

  status text
    not null
    default 'new'
    check (
      status in (
        'new',
        'reviewing',
        'done'
      )
    ),

  created_at timestamptz
    not null
    default now()
);


create index if not exists
suggestions_status_idx
on public.suggestions(
  status,
  created_at desc
);


create index if not exists
suggestions_category_idx
on public.suggestions(category);


alter table public.suggestions
enable row level security;


revoke all
on table public.suggestions
from anon, authenticated;


grant insert (
  identity_type,
  category,
  name,
  contact,
  title,
  content
)
on public.suggestions
to anon, authenticated;


grant select, update, delete
on table public.suggestions
to authenticated;


drop policy if exists
"visitors can submit suggestions"
on public.suggestions;


create policy
"visitors can submit suggestions"
on public.suggestions
for insert
to anon, authenticated
with check (
  status = 'new'
);


drop policy if exists
"admins can read suggestions"
on public.suggestions;


create policy
"admins can read suggestions"
on public.suggestions
for select
to authenticated
using (
  (select private.is_admin())
);


drop policy if exists
"admins can update suggestions"
on public.suggestions;


create policy
"admins can update suggestions"
on public.suggestions
for update
to authenticated
using (
  (select private.is_admin())
)
with check (
  (select private.is_admin())
);


drop policy if exists
"admins can delete suggestions"
on public.suggestions;


create policy
"admins can delete suggestions"
on public.suggestions
for delete
to authenticated
using (
  (select private.is_admin())
);



-- ============================================================
-- 4. 수강상담
-- ============================================================

create table if not exists public.consultations (

  id uuid primary key
    default gen_random_uuid(),

  name text
    not null
    check (
      char_length(name)
      between 1 and 80
    ),

  phone text
    not null
    check (
      char_length(phone)
      between 9 and 20
    ),

  interest text
    not null
    check (
      char_length(interest)
      between 1 and 120
    ),

  contact_method text
    not null
    default '전화 상담'
    check (
      contact_method in (
        '전화 상담',
        '방문 상담'
      )
    ),

  message text
    check (
      message is null
      or char_length(message) <= 3000
    ),

  status text
    not null
    default 'new'
    check (
      status in (
        'new',
        'contacting',
        'done'
      )
    ),

  admin_memo text
    check (
      admin_memo is null
      or char_length(admin_memo) <= 5000
    ),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


-- 과거 SMS 실험용 컬럼이 있다면 제거
alter table public.consultations
drop column if exists sms_sent;

alter table public.consultations
drop column if exists sms_error;


create index if not exists
consultations_status_idx
on public.consultations(
  status,
  created_at desc
);


create index if not exists
consultations_created_idx
on public.consultations(
  created_at desc
);


alter table public.consultations
enable row level security;


revoke all
on table public.consultations
from anon, authenticated;


-- 홈페이지 방문자는 상담 내용 입력만 가능
grant insert (
  name,
  phone,
  interest,
  contact_method,
  message
)
on public.consultations
to anon, authenticated;


-- 관리자만 상담 목록 조회/수정/삭제
grant select, update, delete
on table public.consultations
to authenticated;


drop policy if exists
"visitors can submit consultations"
on public.consultations;


create policy
"visitors can submit consultations"
on public.consultations
for insert
to anon, authenticated
with check (
  status = 'new'
  and admin_memo is null
);


drop policy if exists
"admins can read consultations"
on public.consultations;


create policy
"admins can read consultations"
on public.consultations
for select
to authenticated
using (
  (select private.is_admin())
);


drop policy if exists
"admins can update consultations"
on public.consultations;


create policy
"admins can update consultations"
on public.consultations
for update
to authenticated
using (
  (select private.is_admin())
)
with check (
  (select private.is_admin())
);


drop policy if exists
"admins can delete consultations"
on public.consultations;


create policy
"admins can delete consultations"
on public.consultations
for delete
to authenticated
using (
  (select private.is_admin())
);



-- ============================================================
-- 5. 모집중인 교육과정
-- ============================================================

-- ============================================================
-- 센텀디지털캠프 : 모집중인 교육과정 관리 기능 추가
--
-- 기존 관리자 시스템이 정상 작동하는 상태에서
-- Supabase → SQL Editor → New Query
-- 이 파일 전체 붙여넣기 → Run
--
-- 문자/SMS 기능과는 전혀 관계없습니다.
-- ============================================================

create table if not exists public.recruiting_courses (

  id uuid primary key
    default gen_random_uuid(),

  title text not null
    check (
      char_length(title)
      between 1 and 180
    ),

  support_type text not null
    default '국민내일배움카드'
    check (
      char_length(support_type)
      between 1 and 80
    ),

  start_date date,

  end_date date,

  schedule_text text
    check (
      schedule_text is null
      or char_length(schedule_text) <= 150
    ),

  summary text
    check (
      summary is null
      or char_length(summary) <= 500
    ),

  work24_url text
    check (
      work24_url is null
      or char_length(work24_url) <= 3000
    ),

  detail_url text
    check (
      detail_url is null
      or char_length(detail_url) <= 1000
    ),

  is_recruiting boolean
    not null
    default true,

  display_order integer
    not null
    default 0,

  author_id uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  check (
    start_date is null
    or end_date is null
    or end_date >= start_date
  )
);


create index if not exists
recruiting_courses_active_idx
on public.recruiting_courses(
  is_recruiting,
  display_order,
  start_date
);


create index if not exists
recruiting_courses_end_date_idx
on public.recruiting_courses(end_date);


alter table public.recruiting_courses
enable row level security;


revoke all
on table public.recruiting_courses
from anon, authenticated;


-- 홈페이지 방문자는 현재 모집중이며
-- 종료일이 지나지 않은 과정만 조회합니다.
grant select
on table public.recruiting_courses
to anon, authenticated;


-- 관리자는 전체 조회 / 등록 / 수정 / 삭제할 수 있습니다.
grant insert, update, delete
on table public.recruiting_courses
to authenticated;


drop policy if exists
"public can read active recruiting courses"
on public.recruiting_courses;


create policy
"public can read active recruiting courses"
on public.recruiting_courses
for select
to anon, authenticated
using (
  is_recruiting = true
  and (
    end_date is null
    or end_date >=
      ((now() at time zone 'Asia/Seoul')::date)
  )
);


drop policy if exists
"admins can read all recruiting courses"
on public.recruiting_courses;


create policy
"admins can read all recruiting courses"
on public.recruiting_courses
for select
to authenticated
using (
  (select private.is_admin())
);


drop policy if exists
"admins can insert recruiting courses"
on public.recruiting_courses;


create policy
"admins can insert recruiting courses"
on public.recruiting_courses
for insert
to authenticated
with check (
  (select private.is_admin())
  and (
    author_id is null
    or author_id = (select auth.uid())
  )
);


drop policy if exists
"admins can update recruiting courses"
on public.recruiting_courses;


create policy
"admins can update recruiting courses"
on public.recruiting_courses
for update
to authenticated
using (
  (select private.is_admin())
)
with check (
  (select private.is_admin())
);


drop policy if exists
"admins can delete recruiting courses"
on public.recruiting_courses;


create policy
"admins can delete recruiting courses"
on public.recruiting_courses
for delete
to authenticated
using (
  (select private.is_admin())
);




-- ============================================================
-- 6. 게시글 이미지 Storage
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'post-images',
  'post-images',
  true,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id)
do update set

  public =
    excluded.public,

  file_size_limit =
    excluded.file_size_limit,

  allowed_mime_types =
    excluded.allowed_mime_types;


drop policy if exists
"admins can list post images"
on storage.objects;

drop policy if exists
"admins can upload post images"
on storage.objects;

drop policy if exists
"admins can update post images"
on storage.objects;

drop policy if exists
"admins can delete post images"
on storage.objects;


create policy
"admins can list post images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-images'
  and (select private.is_admin())
);


create policy
"admins can upload post images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and (select private.is_admin())
);


create policy
"admins can update post images"
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


create policy
"admins can delete post images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-images'
  and (select private.is_admin())
);


-- ============================================================
-- 완료
-- ============================================================
