-- ============================================================
-- ProjectMana – Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension (already on by default in Supabase)
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- PROJECTS
-- ──────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users can manage their own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- GOALS
-- ──────────────────────────────────────────────────────────
create type public.goal_status as enum ('active', 'completed', 'paused', 'abandoned');

create table if not exists public.goals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  title       text not null,
  description text,
  status      public.goal_status not null default 'active',
  target_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Users can manage their own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- TASKS
-- ──────────────────────────────────────────────────────────
create type public.task_status   as enum ('todo', 'in_progress', 'done', 'cancelled');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create table if not exists public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  goal_id      uuid references public.goals(id) on delete set null,
  title        text not null,
  description  text,
  status       public.task_status   not null default 'todo',
  priority     public.task_priority not null default 'medium',
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can manage their own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- TRIGGERS – auto-set updated_at
-- ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────
create index if not exists idx_tasks_user_id      on public.tasks(user_id);
create index if not exists idx_tasks_project_id   on public.tasks(project_id);
create index if not exists idx_tasks_goal_id      on public.tasks(goal_id);
create index if not exists idx_tasks_status       on public.tasks(status);
create index if not exists idx_tasks_priority     on public.tasks(priority);
create index if not exists idx_tasks_due_date     on public.tasks(due_date);
create index if not exists idx_goals_user_id      on public.goals(user_id);
create index if not exists idx_goals_project_id   on public.goals(project_id);
create index if not exists idx_projects_user_id   on public.projects(user_id);
