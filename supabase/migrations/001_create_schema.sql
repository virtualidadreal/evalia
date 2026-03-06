-- 001: Create evalia schema + grants

create schema if not exists evalia;

-- Grant access to Supabase roles
grant usage on schema evalia to anon, authenticated, service_role;
grant all privileges on all tables in schema evalia to anon, authenticated, service_role;
grant all privileges on all sequences in schema evalia to anon, authenticated, service_role;
grant all privileges on all routines in schema evalia to anon, authenticated, service_role;

-- Default privileges for future objects
alter default privileges in schema evalia grant all on tables to anon, authenticated, service_role;
alter default privileges in schema evalia grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema evalia grant all on routines to anon, authenticated, service_role;

-- Expose schema via PostgREST
grant usage on schema evalia to authenticator;
-- NOTE: After running this migration, execute in Supabase SQL Editor:
-- ALTER ROLE authenticator SET pgrst.db_schemas = 'public, evalia';
-- NOTIFY pgrst, 'reload config';
