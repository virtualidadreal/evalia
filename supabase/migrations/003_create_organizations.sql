-- 003: Organizations table (schema evalia)

create table evalia.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  industry text,
  size evalia.company_size default '11-50',
  logo_url text,

  -- Billing (Stripe)
  stripe_customer_id text unique,
  subscription_status evalia.subscription_status default 'trialing',
  subscription_plan evalia.subscription_plan default 'starter',
  subscription_period_end timestamptz,
  trial_ends_at timestamptz default (now() + interval '14 days'),

  -- Limits based on plan
  max_employees integer default 25,
  max_admins integer default 1,
  max_campaigns_per_month integer default 2,
  ai_enabled boolean default true,

  -- Metadata
  employee_count integer default 0,
  onboarding_completed boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index organizations_slug_idx on evalia.organizations(slug);
create index organizations_stripe_customer_idx on evalia.organizations(stripe_customer_id);
create index organizations_subscription_status_idx on evalia.organizations(subscription_status);

alter table evalia.organizations enable row level security;

-- RLS policies created after org_members (migration 004)

create trigger organizations_updated_at
  before update on evalia.organizations
  for each row
  execute function evalia.update_updated_at();
