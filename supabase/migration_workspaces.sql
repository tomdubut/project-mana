-- Workspaces table
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.workspaces enable row level security;
create policy "own workspaces" on public.workspaces for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Add workspace_id to existing tables
alter table public.goals add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.work_streams add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.tasks add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.knowledge_pages add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

create index if not exists idx_goals_workspace on public.goals(workspace_id);
create index if not exists idx_streams_workspace on public.work_streams(workspace_id);
create index if not exists idx_tasks_workspace on public.tasks(workspace_id);
create index if not exists idx_pages_workspace on public.knowledge_pages(workspace_id);

-- NOTE: After running this migration, go to Supabase > SQL Editor and run:
-- 1. INSERT INTO public.workspaces (user_id, name, color) VALUES ('<your-user-id>', 'Default', '#6366f1');
-- 2. UPDATE public.goals SET workspace_id = '<workspace-id>' WHERE workspace_id IS NULL;
-- 3. UPDATE public.work_streams SET workspace_id = '<workspace-id>' WHERE workspace_id IS NULL;
-- 4. UPDATE public.tasks SET workspace_id = '<workspace-id>' WHERE workspace_id IS NULL;
-- 5. UPDATE public.knowledge_pages SET workspace_id = '<workspace-id>' WHERE workspace_id IS NULL;
