-- ============================================================
-- ProjectMana v2 — Full Schema
-- Drop old tables first, then recreate everything clean.
-- Run in Supabase SQL Editor.
-- ============================================================

-- ── Drop old types & tables (safe order) ───────────────────
drop table if exists public.tasks      cascade;
drop table if exists public.goals      cascade;
drop table if exists public.projects   cascade;
drop table if exists public.knowledge_pages cascade;
drop table if exists public.work_streams    cascade;
drop table if exists public.api_tokens      cascade;

drop type if exists public.task_status   cascade;
drop type if exists public.task_priority cascade;
drop type if exists public.goal_status   cascade;

-- ── Extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ──────────────────────────────────────────────────
create type public.task_status   as enum ('todo', 'in_progress', 'done', 'blocked');
create type public.task_priority as enum ('high', 'normal', 'low');

-- ══════════════════════════════════════════════════════════
-- WORK STREAMS
-- ══════════════════════════════════════════════════════════
create table public.work_streams (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  color       text not null default '#6366f1',
  is_ongoing  boolean not null default true,
  deadline    date,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.work_streams enable row level security;
create policy "own work_streams" on public.work_streams for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- GOALS
-- ══════════════════════════════════════════════════════════
create table public.goals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  stream_id   uuid references public.work_streams(id) on delete set null,
  title       text not null,
  description text,
  target_date date,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
  -- progress is computed from tasks, not stored
);

alter table public.goals enable row level security;
create policy "own goals" on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- TASKS
-- ══════════════════════════════════════════════════════════
create table public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  stream_id    uuid references public.work_streams(id) on delete set null,
  goal_id      uuid references public.goals(id) on delete set null,
  title        text not null,
  description  text,
  status       public.task_status   not null default 'todo',
  priority     public.task_priority not null default 'normal',
  due_date     date,
  ai_score     smallint check (ai_score between 1 and 10),
  ai_reason    text,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "own tasks" on public.tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- KNOWLEDGE PAGES
-- ══════════════════════════════════════════════════════════
create table public.knowledge_pages (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  stream_id  uuid references public.work_streams(id) on delete set null,
  title      text not null,
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_pages enable row level security;
create policy "own knowledge_pages" on public.knowledge_pages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- API TOKENS  (for external Claude AI access)
-- ══════════════════════════════════════════════════════════
create table public.api_tokens (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  token_hash text not null unique,  -- store bcrypt/sha256 hash, never plaintext
  last_used  timestamptz,
  created_at timestamptz not null default now()
);

alter table public.api_tokens enable row level security;
create policy "own api_tokens" on public.api_tokens for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- TRIGGERS — auto updated_at
-- ══════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_streams_upd  before update on public.work_streams    for each row execute function public.set_updated_at();
create trigger trg_goals_upd    before update on public.goals            for each row execute function public.set_updated_at();
create trigger trg_tasks_upd    before update on public.tasks            for each row execute function public.set_updated_at();
create trigger trg_knowledge_upd before update on public.knowledge_pages for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════
create index idx_tasks_user        on public.tasks(user_id);
create index idx_tasks_stream      on public.tasks(stream_id);
create index idx_tasks_goal        on public.tasks(goal_id);
create index idx_tasks_status      on public.tasks(status);
create index idx_tasks_priority    on public.tasks(priority);
create index idx_tasks_due_date    on public.tasks(due_date);
create index idx_goals_user        on public.goals(user_id);
create index idx_goals_stream      on public.goals(stream_id);
create index idx_streams_user      on public.work_streams(user_id);
create index idx_knowledge_user    on public.knowledge_pages(user_id);
create index idx_knowledge_stream  on public.knowledge_pages(stream_id);
create index idx_api_tokens_hash   on public.api_tokens(token_hash);
