-- Redot Global Maintenance Tracker — Supabase schema
--
-- Run this once in your project's SQL Editor (Supabase Dashboard -> SQL Editor -> New query).
-- This is an internal shared tool: every signed-in user sees and edits the same data
-- (no per-user ownership), so RLS policies just require the caller to be authenticated.

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
  created_at timestamptz not null default now()
);

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

create policy "authenticated full access" on companies for all to authenticated using (true) with check (true);
create policy "authenticated full access" on workers for all to authenticated using (true) with check (true);
create policy "authenticated full access" on packages for all to authenticated using (true) with check (true);
create policy "authenticated full access" on logs for all to authenticated using (true) with check (true);
create policy "authenticated full access" on payments for all to authenticated using (true) with check (true);
create policy "authenticated full access" on worker_costs for all to authenticated using (true) with check (true);
