-- Group XP Tracker — Supabase PostgreSQL Schema
-- Run this SQL in your Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- 1. App Settings (singleton row id = 1)
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  project_name text not null default 'ระบบจดคะแนน',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, project_name)
values (1, 'ระบบจดคะแนน')
on conflict (id) do nothing;

-- 2. Temporary Users (1 User = 1 Group)
create table if not exists public.temp_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  group_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Score Categories
create table if not exists public.score_categories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. Score Sub-items
create table if not exists public.score_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.score_categories(id) on delete cascade,
  title text not null,
  xp integer not null default 0 check (xp >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_score_items_category_id on public.score_items(category_id);

-- 5. Current User Scores (latest passed/failed state per user + item)
create table if not exists public.user_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.temp_users(id) on delete cascade,
  item_id uuid not null references public.score_items(id) on delete cascade,
  passed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists idx_user_scores_user_id on public.user_scores(user_id);

-- 6. Score History (immutable snapshot log for every toggle)
create table if not exists public.score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.temp_users(id) on delete cascade,
  item_id uuid references public.score_items(id) on delete set null,
  category_title text not null,
  item_title text not null,
  xp integer not null default 0,
  passed boolean not null,
  changed_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_score_history_user_id_created on public.score_history(user_id, created_at desc);

-- 7. Evidence Photos
create table if not exists public.evidence_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.temp_users(id) on delete cascade,
  category_id uuid references public.score_categories(id) on delete set null,
  title text not null,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_photos_user_id_created on public.evidence_photos(user_id, created_at desc);

-- 8. Row-Level Security (RLS)
-- All application reads/writes run server-side via SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS).
-- Enabling RLS with no anon/authenticated policies blocks direct PostgREST access.
alter table public.app_settings enable row level security;
alter table public.temp_users enable row level security;
alter table public.score_categories enable row level security;
alter table public.score_items enable row level security;
alter table public.user_scores enable row level security;
alter table public.score_history enable row level security;
alter table public.evidence_photos enable row level security;

-- 9. Atomic RPC for score toggle + immutable history snapshot
create or replace function public.toggle_user_score(
  p_user_id uuid,
  p_item_id uuid,
  p_passed boolean,
  p_category_title text,
  p_item_title text,
  p_xp integer,
  p_changed_by text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_scores (user_id, item_id, passed, updated_at)
  values (p_user_id, p_item_id, p_passed, now())
  on conflict (user_id, item_id)
  do update set passed = excluded.passed, updated_at = excluded.updated_at;

  insert into public.score_history (
    user_id,
    item_id,
    category_title,
    item_title,
    xp,
    passed,
    changed_by
  )
  values (
    p_user_id,
    p_item_id,
    p_category_title,
    p_item_title,
    p_xp,
    p_passed,
    p_changed_by
  );
end;
$$;

-- 10. Storage Bucket for Evidence Photos
insert into storage.buckets (id, name, public)
values ('evidence-photos', 'evidence-photos', true)
on conflict (id) do nothing;
