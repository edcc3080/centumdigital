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


-- 생성 확인
select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'recruiting_courses';
