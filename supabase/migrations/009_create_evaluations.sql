-- 009: Evaluations table (schema evalia)

create table evalia.evaluations (
  id uuid default gen_random_uuid() primary key,
  campaign_id uuid references evalia.campaigns(id) on delete cascade not null,
  employee_id uuid references evalia.employees(id) on delete cascade not null,
  evaluator_type evalia.evaluator_type not null,
  evaluator_name text,
  evaluator_email text,
  evaluator_employee_id uuid references evalia.employees(id) on delete set null,
  token uuid default gen_random_uuid() unique not null,
  status evalia.evaluation_status default 'pending',
  responses jsonb default '{}',
  submitted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index evaluations_campaign_id_idx on evalia.evaluations(campaign_id);
create index evaluations_employee_id_idx on evalia.evaluations(employee_id);
create index evaluations_token_idx on evalia.evaluations(token);
create index evaluations_status_idx on evalia.evaluations(status);

alter table evalia.evaluations enable row level security;

-- Org members can view evaluations of their campaigns
create policy "Members can view evaluations of their campaigns"
  on evalia.evaluations for select
  using (
    exists (
      select 1 from evalia.campaigns
      join evalia.org_members on evalia.org_members.organization_id = evalia.campaigns.organization_id
      where evalia.campaigns.id = evalia.evaluations.campaign_id
      and evalia.org_members.user_id = auth.uid()
    )
  );

create policy "Admins can manage evaluations"
  on evalia.evaluations for all
  using (
    exists (
      select 1 from evalia.campaigns
      join evalia.org_members on evalia.org_members.organization_id = evalia.campaigns.organization_id
      where evalia.campaigns.id = evalia.evaluations.campaign_id
      and evalia.org_members.user_id = auth.uid()
      and evalia.org_members.role = 'admin'
    )
  );

-- Public access by token (external evaluators)
create policy "Anyone can view evaluation by token"
  on evalia.evaluations for select
  using (true);

create policy "Anyone can update evaluation by token"
  on evalia.evaluations for update
  using (true)
  with check (true);

create trigger evaluations_updated_at
  before update on evalia.evaluations
  for each row
  execute function evalia.update_updated_at();

-- Auto-update campaign counters
create or replace function evalia.update_campaign_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update evalia.campaigns set total_evaluations = total_evaluations + 1
    where id = NEW.campaign_id;
  end if;

  if TG_OP = 'UPDATE' and NEW.status = 'submitted' and OLD.status != 'submitted' then
    update evalia.campaigns set completed_evaluations = completed_evaluations + 1
    where id = NEW.campaign_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger evaluations_count_trigger
  after insert or update on evalia.evaluations
  for each row
  execute function evalia.update_campaign_counts();
