-- 004: Org members + organization RLS policies (schema evalia)

create table evalia.org_members (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references evalia.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role evalia.org_role default 'viewer' not null,
  invited_by uuid references auth.users(id),
  invited_at timestamptz default now(),
  joined_at timestamptz default now(),

  unique(organization_id, user_id)
);

create index org_members_org_id_idx on evalia.org_members(organization_id);
create index org_members_user_id_idx on evalia.org_members(user_id);

alter table evalia.org_members enable row level security;

-- org_members RLS
create policy "Members can view members of their org"
  on evalia.org_members for select
  using (
    organization_id in (
      select om.organization_id from evalia.org_members as om
      where om.user_id = auth.uid()
    )
  );

create policy "Admins can insert members"
  on evalia.org_members for insert
  with check (
    exists (
      select 1 from evalia.org_members as om
      where om.organization_id = organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
    )
  );

create policy "Admins can update members"
  on evalia.org_members for update
  using (
    exists (
      select 1 from evalia.org_members as om
      where om.organization_id = evalia.org_members.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
    )
  );

create policy "Admins can delete members"
  on evalia.org_members for delete
  using (
    exists (
      select 1 from evalia.org_members as om
      where om.organization_id = evalia.org_members.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
    )
  );

-- Users can add themselves during registration
create policy "Users can add themselves to new org"
  on evalia.org_members for insert
  with check (user_id = auth.uid());

-- Organization RLS (now that org_members exists)
create policy "Members can view their organization"
  on evalia.organizations for select
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.organizations.id
      and evalia.org_members.user_id = auth.uid()
    )
  );

create policy "Admins can update their organization"
  on evalia.organizations for update
  using (
    exists (
      select 1 from evalia.org_members
      where evalia.org_members.organization_id = evalia.organizations.id
      and evalia.org_members.user_id = auth.uid()
      and evalia.org_members.role = 'admin'
    )
  );

create policy "Super admin can view all organizations"
  on evalia.organizations for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'is_super_admin' = 'true'
    )
  );

create policy "Authenticated users can create organizations"
  on evalia.organizations for insert
  with check (auth.uid() is not null);
