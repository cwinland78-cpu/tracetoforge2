-- Migration: community published tool library
-- Purpose: Lets users publish their saved tools to a public library that
-- anyone can browse and (if paying) use/rate/vote on.
--
-- Rules of the road:
--   * The original photo NEVER appears in published_tools. Only the contour
--     points + a thumbnail rendered from those points. This is a privacy
--     boundary, not a UI choice.
--   * Free users (no purchase rows) can SELECT. Only paying users can
--     INSERT/UPDATE their own rows. Enforced via is_paying_user().
--   * Ratings and votes are separate tables so we can put proper unique
--     constraints on (user_id, tool_id) for one-vote-one-rating semantics.
--
-- Run via Management API or paste into Supabase SQL editor.

-- ─── helper: is the current user a paying user? ───
-- "Paying" = has at least one credit_transactions row with type='purchase'.
-- Stable, security-definer so RLS policies can call it without recursion.
create or replace function public.is_paying_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.credit_transactions
    where user_id = auth.uid()
      and type = 'purchase'
  );
$$;

-- ─── published_tools ───
create table if not exists public.published_tools (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  source_saved_tool_id uuid references public.saved_tools(id) on delete set null,

  -- public-safe metadata
  name text not null,
  category text,
  description text,                 -- short blurb the author can write

  -- the geometry. NO original photo. Just what the editor needs to load it.
  contour jsonb not null,           -- { contours, selectedContour, realWidth, realHeight, toolDepth, tolerance, sensitivity, simplification, minContourPct, toolRotation, cavityBevel }
  thumbnail text,                   -- silhouette PNG data URL, generated client-side from contour points

  -- denormalized aggregates (kept in sync via triggers below) so the listing
  -- query stays fast without joining
  upvotes_count integer not null default 0,
  ratings_count integer not null default 0,
  ratings_sum integer not null default 0,    -- sum of star values; avg = sum/count

  -- moderation
  is_hidden boolean not null default false,  -- author or admin can hide; hidden rows fall out of public listings

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists published_tools_author_id_idx on public.published_tools(author_id);
create index if not exists published_tools_category_idx on public.published_tools(category);
-- "trending" sort: combine recency + engagement
create index if not exists published_tools_engagement_idx on public.published_tools((upvotes_count + ratings_count) desc, created_at desc) where not is_hidden;

alter table public.published_tools enable row level security;

-- public read (anyone, even unauthenticated) for non-hidden rows
drop policy if exists "published_tools_public_read" on public.published_tools;
create policy "published_tools_public_read" on public.published_tools
  for select using (not is_hidden);

-- only paying users can publish, and only as themselves
drop policy if exists "published_tools_paid_insert" on public.published_tools;
create policy "published_tools_paid_insert" on public.published_tools
  for insert with check (
    auth.uid() = author_id
    and public.is_paying_user()
  );

-- author can update their own row (e.g. tweak description, hide it)
drop policy if exists "published_tools_author_update" on public.published_tools;
create policy "published_tools_author_update" on public.published_tools
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "published_tools_author_delete" on public.published_tools;
create policy "published_tools_author_delete" on public.published_tools
  for delete using (auth.uid() = author_id);

-- touch updated_at
create or replace function public.touch_published_tools_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists published_tools_touch_updated_at on public.published_tools;
create trigger published_tools_touch_updated_at
  before update on public.published_tools
  for each row execute function public.touch_published_tools_updated_at();


-- ─── published_tool_ratings ───
create table if not exists public.published_tool_ratings (
  tool_id uuid not null references public.published_tools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (tool_id, user_id)
);

alter table public.published_tool_ratings enable row level security;

-- anyone can see rating rows (we'll mostly read aggregates from published_tools, but useful for "did I rate this" check)
drop policy if exists "ratings_public_read" on public.published_tool_ratings;
create policy "ratings_public_read" on public.published_tool_ratings for select using (true);

-- paying users can insert their own rating
drop policy if exists "ratings_paid_insert" on public.published_tool_ratings;
create policy "ratings_paid_insert" on public.published_tool_ratings
  for insert with check (
    auth.uid() = user_id
    and public.is_paying_user()
  );

-- can update or delete their own rating
drop policy if exists "ratings_self_update" on public.published_tool_ratings;
create policy "ratings_self_update" on public.published_tool_ratings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id and public.is_paying_user());
drop policy if exists "ratings_self_delete" on public.published_tool_ratings;
create policy "ratings_self_delete" on public.published_tool_ratings
  for delete using (auth.uid() = user_id);

-- aggregate trigger
create or replace function public.refresh_rating_aggregate()
returns trigger language plpgsql as $$
declare
  target_tool uuid;
begin
  target_tool := coalesce(new.tool_id, old.tool_id);
  update public.published_tools
    set ratings_count = (select count(*) from public.published_tool_ratings where tool_id = target_tool),
        ratings_sum = (select coalesce(sum(stars), 0) from public.published_tool_ratings where tool_id = target_tool)
    where id = target_tool;
  return null;
end;
$$;
drop trigger if exists ratings_after_change on public.published_tool_ratings;
create trigger ratings_after_change
  after insert or update or delete on public.published_tool_ratings
  for each row execute function public.refresh_rating_aggregate();


-- ─── published_tool_votes (upvotes only - no downvotes, less drama) ───
create table if not exists public.published_tool_votes (
  tool_id uuid not null references public.published_tools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tool_id, user_id)
);

alter table public.published_tool_votes enable row level security;

drop policy if exists "votes_public_read" on public.published_tool_votes;
create policy "votes_public_read" on public.published_tool_votes for select using (true);

drop policy if exists "votes_paid_insert" on public.published_tool_votes;
create policy "votes_paid_insert" on public.published_tool_votes
  for insert with check (
    auth.uid() = user_id
    and public.is_paying_user()
  );

drop policy if exists "votes_self_delete" on public.published_tool_votes;
create policy "votes_self_delete" on public.published_tool_votes
  for delete using (auth.uid() = user_id);

create or replace function public.refresh_vote_aggregate()
returns trigger language plpgsql as $$
declare
  target_tool uuid;
begin
  target_tool := coalesce(new.tool_id, old.tool_id);
  update public.published_tools
    set upvotes_count = (select count(*) from public.published_tool_votes where tool_id = target_tool)
    where id = target_tool;
  return null;
end;
$$;
drop trigger if exists votes_after_change on public.published_tool_votes;
create trigger votes_after_change
  after insert or delete on public.published_tool_votes
  for each row execute function public.refresh_vote_aggregate();
