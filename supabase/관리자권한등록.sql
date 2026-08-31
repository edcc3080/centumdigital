-- 관리자 Auth 계정을 만든 뒤 이 SQL을 실행하세요.
-- 현재 관리자 이메일 기준입니다.

insert into public.admin_users (
  user_id,
  display_name
)
select
  id,
  '센텀디지털캠프 관리자'
from auth.users
where lower(email) =
      lower('edcc3080@gmail.com')
on conflict (user_id)
do update set
  display_name =
    excluded.display_name;


-- 관리자 권한 연결 확인
select
  u.email,
  u.id as auth_user_id,
  a.user_id as admin_user_id,
  (u.id = a.user_id) as id_same,
  a.display_name
from auth.users u
left join public.admin_users a
  on a.user_id = u.id
where lower(u.email) =
      lower('edcc3080@gmail.com');
