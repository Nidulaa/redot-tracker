-- Redot Global Maintenance Tracker — Supabase schema
--
-- Safe to run multiple times (idempotent). Run it in your project's SQL Editor
-- (Supabase Dashboard -> SQL Editor -> New query) any time the app's data
-- model changes — re-running it after the first time will just apply the
-- new/changed parts.
--
-- This is an internal shared tool: every signed-in user sees and edits the
-- same data (no per-user ownership on companies/payments/etc), so RLS
-- policies just require the caller to be authenticated.
--
-- Workers are 1:1 with login accounts: every account you create in
-- Authentication -> Users automatically gets a matching row in `workers`
-- (via the trigger below), and the app logs time against whichever worker
-- row matches the signed-in account — there's no "add a worker" step.

create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "annualHours" numeric not null default 12,
  created_at timestamptz not null default now()
);

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "userId" uuid unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table workers add column if not exists "userId" uuid unique references auth.users(id) on delete cascade;

create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid references companies(id) on delete set null,
  date date not null,
  hours numeric not null,
  cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid references companies(id) on delete set null,
  "workerId" uuid references workers(id) on delete set null,
  date date not null,
  task text,
  minutes numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid references companies(id) on delete set null,
  date date not null,
  amount numeric not null,
  status text not null default 'paid',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists worker_costs (
  id uuid primary key default gen_random_uuid(),
  "workerId" uuid references workers(id) on delete set null,
  "companyId" uuid references companies(id) on delete set null,
  date date not null,
  amount numeric not null,
  note text,
  created_at timestamptz not null default now()
);

alter table companies enable row level security;
alter table workers enable row level security;
alter table packages enable row level security;
alter table logs enable row level security;
alter table payments enable row level security;
alter table worker_costs enable row level security;

drop policy if exists "authenticated full access" on companies;
drop policy if exists "authenticated full access" on workers;
drop policy if exists "authenticated full access" on packages;
drop policy if exists "authenticated full access" on logs;
drop policy if exists "authenticated full access" on payments;
drop policy if exists "authenticated full access" on worker_costs;

create policy "authenticated full access" on companies for all to authenticated using (true) with check (true);
create policy "authenticated full access" on workers for all to authenticated using (true) with check (true);
create policy "authenticated full access" on packages for all to authenticated using (true) with check (true);
create policy "authenticated full access" on logs for all to authenticated using (true) with check (true);
create policy "authenticated full access" on payments for all to authenticated using (true) with check (true);
create policy "authenticated full access" on worker_costs for all to authenticated using (true) with check (true);

-- ---------- auto-create a worker row for every login account ----------
create or replace function public.handle_new_worker_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workers (name, "userId")
  values (
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.id
  )
  on conflict ("userId") do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_worker_user();

-- backfill: create worker rows for any account that already existed before
-- this trigger was added
insert into public.workers (name, "userId")
select
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.id
from auth.users u
left join public.workers w on w."userId" = u.id
where w.id is null;

-- ---------- admin income/expense ledger ----------
-- Separate from `payments` (client billing) and `worker_costs` (worker
-- payouts): a general business ledger the admin fills in by hand, only
-- visible/editable from the Admin Report tab. Genuinely restricted at the
-- database level (unlike every other table above) to the email(s) listed
-- here — keep this list in sync with ADMIN_EMAILS in frontend/src/config.js.
create table if not exists admin_income (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  description text,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  description text,
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table admin_income enable row level security;
alter table admin_expenses enable row level security;

drop policy if exists "admin only" on admin_income;
drop policy if exists "admin only" on admin_expenses;

create policy "admin only" on admin_income for all to authenticated
  using (auth.jwt() ->> 'email' = any (array['nidulalokuge@gmail.com']))
  with check (auth.jwt() ->> 'email' = any (array['nidulalokuge@gmail.com']));

create policy "admin only" on admin_expenses for all to authenticated
  using (auth.jwt() ->> 'email' = any (array['nidulalokuge@gmail.com']))
  with check (auth.jwt() ->> 'email' = any (array['nidulalokuge@gmail.com']));
