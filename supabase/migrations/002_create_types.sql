-- 002: Enums y tipos base (schema evalia)
set search_path to evalia;

create type evalia.company_size as enum ('1-10', '11-50', '51-200', '201-500', '500+');
create type evalia.org_role as enum ('admin', 'manager', 'viewer');
create type evalia.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'unpaid');
create type evalia.subscription_plan as enum ('starter', 'growth', 'business', 'enterprise');
create type evalia.eval_type as enum ('competencies', 'performance', 'potential', 'integral', '360');
create type evalia.campaign_status as enum ('draft', 'active', 'paused', 'completed', 'archived');
create type evalia.evaluation_status as enum ('pending', 'in_progress', 'submitted', 'expired');
create type evalia.evaluator_type as enum ('self', 'manager', 'peer', 'subordinate', 'external');
create type evalia.report_type as enum ('individual', 'team', 'department', 'company', 'comparison');
create type evalia.seniority_level as enum ('junior', 'mid', 'senior', 'lead', 'manager', 'director', 'c-level');

-- Helper function for updated_at triggers
create or replace function evalia.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
