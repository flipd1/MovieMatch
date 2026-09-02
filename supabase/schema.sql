-- MovieMatch database schema.
--
-- This file has been rewritten to migrate from a client-supplied anon_id
-- (a raw UUID the browser generated and sent as a plain column value) to
-- Supabase's built-in anonymous authentication (auth.uid()). The old model
-- let anyone holding the public anon key read/write/delete ANY row for ANY
-- user just by supplying that user's anon_id — confirmed exploitable in a
-- security audit. auth.uid() is set by Supabase's auth system from a
-- verified session JWT and cannot be spoofed by the client, closing that
-- hole entirely.
--
-- Run this once in your Supabase project's SQL editor. It is safe to
-- re-run: table/column creation uses IF NOT EXISTS, and policy creation is
-- guarded so it won't error if the policy already exists.

-- ---------------------------------------------------------------------
-- 1. Lock down and retire the old anon_id-keyed tables.
--
-- The old anon_id values aren't tied to any real Supabase auth user, so
-- there's no automatic way to carry old ratings/preferences over to a real
-- account — this is a clean cutover, not an in-place migration. The old
-- tables are renamed aside (not dropped) so you can manually inspect or
-- export anything from them first; their anon-key policies are dropped
-- immediately so they're no longer readable/writable by anyone.
-- ---------------------------------------------------------------------

drop policy if exists "anon key can read/write ratings" on ratings;
drop policy if exists "anon key can read/write preferences" on preferences;

alter table if exists ratings rename to ratings_legacy_anon_id;
alter table if exists preferences rename to preferences_legacy_anon_id;

-- ---------------------------------------------------------------------
-- 2. Ratings, keyed to a real auth user.
-- ---------------------------------------------------------------------

create table if not exists ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id integer not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists ratings_user_id_idx on ratings (user_id);

alter table ratings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ratings'
      and policyname = 'users manage their own ratings'
  ) then
    create policy "users manage their own ratings"
      on ratings
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Preferences, keyed to a real auth user, with a content constraint on
-- `services` (flagged as a minor gap in the security audit: previously
-- nothing stopped an oversized or garbage array being written there).
-- ---------------------------------------------------------------------

create or replace function is_valid_service_ids(ids integer[])
returns boolean
language sql
immutable
as $$
  select coalesce(array_length(ids, 1), 0) <= 20
     and not exists (
       select 1 from unnest(ids) as s where s <= 0 or s > 100000
     );
$$;

create table if not exists preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  services integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint services_valid check (is_valid_service_ids(services))
);

-- Pro access flag for gated features (e.g. the "Your Stats" page). There's
-- no payment provider wired up yet, so this is a plain boolean a user can
-- flip themselves from Settings — a placeholder for a real
-- subscription/billing check later, not a security boundary today.
alter table preferences add column if not exists is_pro boolean not null default false;

-- Early access ("Beta") flag. Infrastructure only — no feature reads this
-- yet. Intended to layer on top of is_pro (early access is offered to Pro
-- users), so a beta feature should gate on isPro && earlyAccess, not this
-- column alone. Same placeholder-boolean approach as is_pro until real
-- billing/entitlements exist.
alter table preferences add column if not exists early_access boolean not null default false;

alter table preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'preferences'
      and policyname = 'users manage their own preferences'
  ) then
    create policy "users manage their own preferences"
      on preferences
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Dismissed recommendations ("Not Interested"), keyed to a real auth
-- user. A movie_id in here is excluded from that user's future candidate
-- pool (Recommended for You and Watch Tonight both read this).
-- ---------------------------------------------------------------------

create table if not exists dismissed_recommendations (
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists dismissed_recommendations_user_id_idx
  on dismissed_recommendations (user_id);

alter table dismissed_recommendations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dismissed_recommendations'
      and policyname = 'users manage their own dismissed recommendations'
  ) then
    create policy "users manage their own dismissed recommendations"
      on dismissed_recommendations
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Custom lists ("My Lists", Pro-gated) and their movie membership,
-- keyed to a real auth user. list_movies carries user_id directly
-- (denormalized off lists.user_id) so its RLS policy can check
-- auth.uid() directly instead of a subquery into lists, matching every
-- other table's policy shape in this file.
-- ---------------------------------------------------------------------

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create index if not exists lists_user_id_idx on lists (user_id);

alter table lists enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'lists'
      and policyname = 'users manage their own lists'
  ) then
    create policy "users manage their own lists"
      on lists
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists list_movies (
  list_id uuid not null references lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id integer not null,
  added_at timestamptz not null default now(),
  primary key (list_id, movie_id)
);

create index if not exists list_movies_list_id_idx on list_movies (list_id);
create index if not exists list_movies_user_id_idx on list_movies (user_id);

alter table list_movies enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'list_movies'
      and policyname = 'users manage their own list movies'
  ) then
    create policy "users manage their own list movies"
      on list_movies
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- OPTIONAL, DESTRUCTIVE: drop the legacy anon_id tables from section 1.
--
-- They already have no policies (see section 1), so nothing can read or
-- write them — this just removes the dead data from the database. NOT run
-- automatically as part of the migration above: if you want anything out
-- of the old anon_id-keyed rows first, export it before running this.
-- Uncomment and run manually when you're ready.
-- ---------------------------------------------------------------------

-- drop table if exists ratings_legacy_anon_id;
-- drop table if exists preferences_legacy_anon_id;
