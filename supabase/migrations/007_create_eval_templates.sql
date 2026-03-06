-- 007: Evaluation templates (schema evalia)

create table evalia.eval_templates (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references evalia.organizations(id) on delete cascade not null,
  created_by uuid references auth.users(id),
  name text not null,
  description text,
  eval_type evalia.eval_type default 'integral',
  competencies jsonb default '[]',
  questions jsonb default '[]',
  rubric jsonb default '{}',
  ai_generated boolean default false,
  ai_prompt text,
  is_template boolean default false,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index eval_templates_org_id_idx on evalia.eval_templates(organization_id);

alter table evalia.eval_templates enable row level security;

create policy "Members can view templates of their org"
  on evalia.eval_templates for select
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.eval_templates.organization_id
      and evalia.org_members.user_id = auth.uid()
    )
  );

create policy "Admins can manage templates"
  on evalia.eval_templates for all
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.eval_templates.organization_id
      and evalia.org_members.user_id = auth.uid()
      and evalia.org_members.role = 'admin'
    )
  );

create trigger eval_templates_updated_at
  before update on evalia.eval_templates
  for each row
  execute function evalia.update_updated_at();
