begin;

alter table public."UserRoles" add column if not exists "Username" text;

with candidates as (
  select r."UserId",
    left(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9._-]', '_', 'g'), 48) as candidate
  from public."UserRoles" r join auth.users u on u.id = r."UserId"
  where r."Username" is null
), normalized as (
  select "UserId",
    case when candidate ~ '^[a-z0-9]' then candidate else 'user_' || candidate end as candidate
  from candidates
), numbered as (
  select *, row_number() over (partition by candidate order by "UserId") as position
  from normalized
)
update public."UserRoles" r
set "Username" = n.candidate || case when n.position > 1 then '_' || left(replace(n."UserId"::text, '-', ''), 12) else '' end
from numbered n where r."UserId" = n."UserId";

alter table public."UserRoles" add constraint user_roles_username_format
  check ("Username" is null or "Username" ~ '^[a-z0-9][a-z0-9._-]{0,63}$');
create unique index user_roles_username_unique on public."UserRoles" ("Username") where "Username" is not null;

create schema if not exists app_auth;
revoke all on schema app_auth from public, anon, authenticated;
create table app_auth.login_attempts (
  key text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table app_auth.login_attempts enable row level security;
revoke all on app_auth.login_attempts from public, anon, authenticated;

create function public.consume_username_login_attempt(p_username text)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  attempt_time timestamptz := statement_timestamp();
  used integer;
  global_used integer;
begin
  delete from app_auth.login_attempts where window_start < attempt_time - interval '1 day';
  insert into app_auth.login_attempts as a (key, window_start, attempts)
  values ('global', attempt_time, 1)
  on conflict (key) do update set
    window_start = case when a.window_start <= attempt_time - interval '5 minutes' then attempt_time else a.window_start end,
    attempts = case when a.window_start <= attempt_time - interval '5 minutes' then 1 else a.attempts + 1 end
  returning attempts into global_used;
  if global_used > 200 then return false; end if;

  insert into app_auth.login_attempts as a (key, window_start, attempts)
  values (md5(lower(trim(p_username))), attempt_time, 1)
  on conflict (key) do update set
    window_start = case when a.window_start <= attempt_time - interval '5 minutes' then attempt_time else a.window_start end,
    attempts = case when a.window_start <= attempt_time - interval '5 minutes' then 1 else a.attempts + 1 end
  returning attempts into used;
  return used <= 10;
end;
$$;
revoke all on function public.consume_username_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_username_login_attempt(text) to service_role;

commit;
