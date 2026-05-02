-- Run this in Supabase SQL Editor (Dashboard → SQL).
-- Creates profiles, program_state, updated_at trigger, RLS, and policies per project plan.

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- Backfill columns if profiles already existed before this schema.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

create table if not exists public.program_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  days text not null,
  times text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill columns if program_state already existed before this schema.
alter table public.program_state add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.program_state add column if not exists updated_at timestamptz not null default now();
alter table public.schedules add column if not exists days text;
alter table public.schedules add column if not exists times text;
alter table public.schedules add column if not exists created_at timestamptz not null default now();
alter table public.schedules add column if not exists updated_at timestamptz not null default now();

create index if not exists program_state_updated_at_idx on public.program_state (updated_at desc);
create index if not exists schedules_user_id_idx on public.schedules (user_id, created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.program_state enable row level security;
alter table public.schedules enable row level security;

-- profiles: any signed-in user can read; only owner can insert/update
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- program_state: any signed-in user can read; only owner can write
drop policy if exists "program_state_select_authenticated" on public.program_state;
create policy "program_state_select_authenticated"
  on public.program_state for select
  to authenticated
  using (true);

drop policy if exists "program_state_insert_own" on public.program_state;
create policy "program_state_insert_own"
  on public.program_state for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "program_state_update_own" on public.program_state;
create policy "program_state_update_own"
  on public.program_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "program_state_delete_own" on public.program_state;
create policy "program_state_delete_own"
  on public.program_state for delete
  to authenticated
  using (auth.uid() = user_id);

-- schedules: any signed-in user can read; only owner can write
drop policy if exists "schedules_select_authenticated" on public.schedules;
create policy "schedules_select_authenticated"
  on public.schedules for select
  to authenticated
  using (true);

drop policy if exists "schedules_insert_own" on public.schedules;
create policy "schedules_insert_own"
  on public.schedules for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "schedules_update_own" on public.schedules;
create policy "schedules_update_own"
  on public.schedules for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "schedules_delete_own" on public.schedules;
create policy "schedules_delete_own"
  on public.schedules for delete
  to authenticated
  using (auth.uid() = user_id);
