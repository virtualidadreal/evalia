-- 011: Storage buckets (evalia-specific names to avoid conflicts)

insert into storage.buckets (id, name, public)
values
  ('evalia-logos', 'evalia-logos', true),
  ('evalia-reports', 'evalia-reports', false);

-- Logos: public read, authenticated upload
create policy "Public can view evalia logos"
  on storage.objects for select
  using (bucket_id = 'evalia-logos');

create policy "Authenticated users can upload evalia logos"
  on storage.objects for insert
  with check (
    bucket_id = 'evalia-logos'
    and auth.uid() is not null
  );

create policy "Authenticated users can update evalia logos"
  on storage.objects for update
  using (
    bucket_id = 'evalia-logos'
    and auth.uid() is not null
  );

-- Reports: private, only authenticated
create policy "Authenticated can view evalia reports"
  on storage.objects for select
  using (
    bucket_id = 'evalia-reports'
    and auth.uid() is not null
  );

create policy "Authenticated can upload evalia reports"
  on storage.objects for insert
  with check (
    bucket_id = 'evalia-reports'
    and auth.uid() is not null
  );
