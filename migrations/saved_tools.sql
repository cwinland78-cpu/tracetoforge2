-- Migration: saved_tools
-- Purpose: Lets users save a traced tool (contour points + image + dimensions + edit lock)
-- so they can reuse it across multiple tray projects without re-tracing.
--
-- Run this once in the Supabase SQL editor for project pzmykycxmbzbrzkyotkc.

create table if not exists public.saved_tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text,                     -- optional grouping ("pliers", "wrenches", etc.)
  config jsonb not null,             -- contours, dimensions, sensitivity, locked, image (base64)
  thumbnail text,                    -- small base64 preview, separate so we can list without pulling full image
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for the typical "list this user's tools" query
create index if not exists saved_tools_user_id_idx on public.saved_tools(user_id, created_at desc);

-- RLS: users can only see and modify their own saved tools.
-- Service role bypasses RLS so the webhook worker etc. continue to work.
alter table public.saved_tools enable row level security;

drop policy if exists "saved_tools_select_own" on public.saved_tools;
create policy "saved_tools_select_own" on public.saved_tools
  for select using (auth.uid() = user_id);

drop policy if exists "saved_tools_insert_own" on public.saved_tools;
create policy "saved_tools_insert_own" on public.saved_tools
  for insert with check (auth.uid() = user_id);

drop policy if exists "saved_tools_update_own" on public.saved_tools;
create policy "saved_tools_update_own" on public.saved_tools
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saved_tools_delete_own" on public.saved_tools;
create policy "saved_tools_delete_own" on public.saved_tools
  for delete using (auth.uid() = user_id);

-- Auto-update updated_at on row modification
create or replace function public.touch_saved_tools_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_tools_touch_updated_at on public.saved_tools;
create trigger saved_tools_touch_updated_at
  before update on public.saved_tools
  for each row execute function public.touch_saved_tools_updated_at();
