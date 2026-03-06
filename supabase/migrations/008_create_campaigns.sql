-- 008: Campaigns table (schema evalia)

create table evalia.campaigns (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references evalia.organizations(id) on delete cascade not null,
  template_id uuid references evalia.eval_templates(id) on delete set null,
  created_by uuid references auth.users(id),
  name text not null,
  description text,
  status evalia.campaign_status default 'draft',
  start_date date,
  end_date date,
  settings jsonb default '{}',
  total_evaluations integer default 0,
  completed_evaluations integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index campaigns_org_id_idx on evalia.campaigns(organization_id);
create index campaigns_status_idx on evalia.campaigns(status);

alter table evalia.campaigns enable row level security;

create policy "Members can view campaigns of their org"
  on evalia.campaigns for select
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.campaigns.organization_id
      and evalia.org_members.user_id = auth.uid()
    )
  );

create policy "Admins can manage campaigns"
  on evalia.campaigns for all
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.campaigns.organization_id
      and evalia.org_members.user_id = auth.uid()
      and evalia.org_members.role = 'admin'
    )
  );

create trigger campaigns_updated_at
  before update on evalia.campaigns
  for each row
  execute function evalia.update_updated_at();
