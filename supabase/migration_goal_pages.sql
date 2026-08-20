-- Add goal_id to knowledge_pages so pages can be linked to projects directly
alter table public.knowledge_pages add column if not exists goal_id uuid references public.goals(id) on delete set null;
create index if not exists idx_knowledge_goal on public.knowledge_pages(goal_id);
