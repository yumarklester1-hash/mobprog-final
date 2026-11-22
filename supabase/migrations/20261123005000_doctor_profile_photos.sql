create or replace view public.doctors with (security_invoker = false) as
select id, name, specialty, profile_photo_path
from public.profiles
where role = 'doctor';

grant select on public.doctors to authenticated;

drop policy if exists "Users can read permitted profile photos" on storage.objects;
create policy "Users can read permitted profile photos"
on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-photos'
  and (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    or exists (
      select 1
      from public.doctors d
      where d.id::text = split_part(storage.objects.name, '/', 1)
    )
    or (
      public.is_doctor()
      and exists (
        select 1
        from public.appointments a
        where a.patient_id::text = split_part(storage.objects.name, '/', 1)
          and a.doctor_id = auth.uid()
      )
    )
  )
);
