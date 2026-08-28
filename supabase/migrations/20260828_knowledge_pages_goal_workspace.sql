-- Add goal_id and workspace_id to knowledge_pages if missing
alter table knowledge_pages
  add column if not exists goal_id uuid references goals(id) on delete set null,
  add column if not exists workspace_id uuid references workspaces(id) on delete set null;
