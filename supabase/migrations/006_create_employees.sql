-- 006: Employees table (schema evalia)

create table evalia.employees (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references evalia.organizations(id) on delete cascade not null,
  department_id uuid references evalia.departments(id) on delete set null,
  full_name text not null,
  email text not null,
  position text not null,
  seniority evalia.seniority_level default 'mid',
  hire_date date,
  manager_id uuid references evalia.employees(id) on delete set null,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index employees_org_id_idx on evalia.employees(organization_id);
create index employees_department_id_idx on evalia.employees(department_id);
create index employees_manager_id_idx on evalia.employees(manager_id);
create index employees_email_org_idx on evalia.employees(email, organization_id);

alter table evalia.employees enable row level security;

create policy "Members can view employees of their org"
  on evalia.employees for select
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.employees.organization_id
      and evalia.org_members.user_id = auth.uid()
    )
  );

create policy "Admins can manage employees"
  on evalia.employees for all
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.employees.organization_id
      and evalia.org_members.user_id = auth.uid()
      and evalia.org_members.role = 'admin'
    )
  );

create trigger employees_updated_at
  before update on evalia.employees
  for each row
  execute function evalia.update_updated_at();

-- Auto-update employee_count on organizations
create or replace function evalia.update_employee_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update evalia.organizations set employee_count = employee_count + 1 where id = NEW.organization_id;
  elsif TG_OP = 'DELETE' then
    update evalia.organizations set employee_count = employee_count - 1 where id = OLD.organization_id;
  end if;
  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

create trigger employees_count_trigger
  after insert or delete on evalia.employees
  for each row
  execute function evalia.update_employee_count();
