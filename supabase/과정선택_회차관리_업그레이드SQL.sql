-- ============================================================
-- 센텀디지털캠프
-- 과정 선택 + 회차 관리 + 과정별 세부페이지 업그레이드
--
-- 기존 recruiting_courses 테이블을 그대로 살리면서
-- 과정 구분(course_key)과 회차명(round_label)을 추가합니다.
--
-- Supabase → SQL Editor → New Query
-- 전체 붙여넣기 → Run
-- ============================================================


-- 1) 과정 구분 컬럼 추가
alter table public.recruiting_courses
add column if not exists course_key text
not null
default 'other';


-- 2) 회차명 추가
alter table public.recruiting_courses
add column if not exists round_label text;


-- 3) 기존에 등록해둔 과정들을 가능한 범위에서 자동 분류
update public.recruiting_courses
set course_key = 'ebook'
where
  lower(title) like '%sigil%'
  or lower(title) like '%e-book%'
  or title like '%전자책%';


update public.recruiting_courses
set course_key = 'youtube'
where
  title like '%유튜브%'
  or lower(title) like '%vrew%'
  or lower(title) like '%capcut%';


update public.recruiting_courses
set course_key = 'itq'
where
  lower(title) like '%itq%'
  or title like '%한글, 엑셀, 파워포인트%';


update public.recruiting_courses
set course_key = 'smartstore'
where
  title like '%스마트스토어%'
  or title like '%전자상거래%';


update public.recruiting_courses
set course_key = 'chatgpt'
where
  lower(title) like '%chatgpt%'
  and course_key = 'other';


-- 4) 허용 과정만 저장되도록 체크
alter table public.recruiting_courses
drop constraint if exists
recruiting_courses_course_key_check;


alter table public.recruiting_courses
add constraint
recruiting_courses_course_key_check
check (
  course_key in (
    'ebook',
    'youtube',
    'chatgpt',
    'itq',
    'smartstore',
    'other'
  )
);


-- 5) 회차명 길이 제한
alter table public.recruiting_courses
drop constraint if exists
recruiting_courses_round_label_check;


alter table public.recruiting_courses
add constraint
recruiting_courses_round_label_check
check (
  round_label is null
  or char_length(round_label) <= 100
);


-- 6) 과정별 현재 회차 조회를 빠르게 하는 인덱스
create index if not exists
recruiting_courses_course_key_idx
on public.recruiting_courses(
  course_key,
  is_recruiting,
  start_date,
  end_date
);


-- 7) 확인
select
  id,
  course_key,
  title,
  round_label,
  start_date,
  end_date,
  is_recruiting
from public.recruiting_courses
order by created_at desc;
