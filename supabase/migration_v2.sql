-- ============================================================
-- Migration: Goals → Streams → Tasks
-- Goals move to top level. Streams optionally link up to a Goal.
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Add goal_id to work_streams
alter table public.work_streams
  add column goal_id uuid references public.goals(id) on delete set null;

-- 2. Drop stream_id from goals
alter table public.goals
  drop column stream_id;

-- 3. Index
create index if not exists idx_streams_goal on public.work_streams(goal_id);
