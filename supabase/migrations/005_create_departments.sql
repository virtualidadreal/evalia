-- 005: Departments table (schema evalia)

create table evalia.departments (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references evalia.organizations(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index departments_org_id_idx on evalia.departments(organization_id);

alter table evalia.departments enable row level security;

create policy "Members can view departments of their org"
  on evalia.departments for select
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.departments.organization_id
      and evalia.org_members.user_id = auth.uid()
    )
  );

create policy "Admins can manage departments"
  on evalia.departments for all
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.departments.organization_id
      and evalia.org_members.user_id = auth.uid()
      and evalia.org_members.role = 'admin'
    )
  );

create trigger departments_updated_at
  before update on evalia.departments
  for each row
  execute function evalia.update_updated_at();
