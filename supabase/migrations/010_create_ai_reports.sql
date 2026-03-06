-- 010: AI Reports table (schema evalia)

create table evalia.ai_reports (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references evalia.organizations(id) on delete cascade not null,
  campaign_id uuid references evalia.campaigns(id) on delete cascade not null,
  employee_id uuid references evalia.employees(id) on delete set null,
  report_type evalia.report_type not null,
  title text not null,
  content jsonb default '{}',
  insights jsonb default '[]',
  scores jsonb default '{}',
  pdf_url text,
  created_at timestamptz default now()
);

create index ai_reports_org_id_idx on evalia.ai_reports(organization_id);
create index ai_reports_campaign_id_idx on evalia.ai_reports(campaign_id);
create index ai_reports_employee_id_idx on evalia.ai_reports(employee_id);

alter table evalia.ai_reports enable row level security;

create policy "Members can view reports of their org"
  on evalia.ai_reports for select
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.ai_reports.organization_id
      and evalia.org_members.user_id = auth.uid()
    )
  );

create policy "Admins can manage reports"
  on evalia.ai_reports for all
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.ai_reports.organization_id
      and evalia.org_members.user_id = auth.uid()
      and evalia.org_members.role = 'admin'
    )
  );
