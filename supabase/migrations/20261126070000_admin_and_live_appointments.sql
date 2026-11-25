alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('patient', 'doctor', 'admin'));

alter table public.appointments
  drop constraint if exists appointments_cancelled_by_check;

alter table public.appointments
  add constraint appointments_cancelled_by_check
  check (cancelled_by in ('patient', 'doctor', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.prevent_admin_role_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role = 'admin'
    and old.role is distinct from 'admin'
    and auth.uid() is not null then
    raise exception 'Administrator accounts must be provisioned outside the app.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_admin_role_assignment
before update of role on public.profiles
for each row execute function public.prevent_admin_role_assignment();

create or replace function public.prevent_admin_profile_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_admin() and new.id <> auth.uid() then
    if new.first_name is distinct from old.first_name
      or new.last_name is distinct from old.last_name
      or new.name is distinct from old.name
      or new.phone is distinct from old.phone then
      raise exception 'Administrators cannot edit another user''s personal details.';
    end if;
    if new.profile_photo_path is distinct from old.profile_photo_path
      and new.role <> 'doctor' then
      raise exception 'Administrators can only manage dentist profile photos.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_admin_profile_scope
before update on public.profiles
for each row execute function public.prevent_admin_profile_scope();

create or replace function public.admin_update_doctor_profile(
  target_id uuid,
  target_role text,
  target_specialty text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can manage dentist profiles.';
  end if;
  if target_role not in ('patient', 'doctor') then
    raise exception 'The requested account role is not permitted.';
  end if;

  update public.profiles
  set role = target_role,
      specialty = case when target_role = 'doctor' then target_specialty else null end
  where id = target_id and role in ('patient', 'doctor');

  if not found then
    raise exception 'The account was not found or cannot be managed.';
  end if;
end;
$$;

revoke execute on function public.admin_update_doctor_profile(uuid, text, text) from public, anon;
grant execute on function public.admin_update_doctor_profile(uuid, text, text) to authenticated;

drop policy if exists "Users can view their profile and assigned patients" on public.profiles;
create policy "Users can view their profile and assigned patients"
on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or (
    public.is_doctor()
    and exists (
      select 1
      from public.appointments a
      where a.patient_id = profiles.id
        and a.doctor_id = auth.uid()
    )
  )
);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Patients and assigned doctors can view appointments" on public.appointments;
create policy "Patients and assigned doctors can view appointments"
on public.appointments
for select to authenticated
using (
  patient_id = auth.uid()
  or (doctor_id = auth.uid() and public.is_doctor())
  or public.is_admin()
);

drop policy if exists "Patients and assigned doctors can update appointments" on public.appointments;
create policy "Patients and assigned doctors can update appointments"
on public.appointments
for update to authenticated
using (
  patient_id = auth.uid()
  or (doctor_id = auth.uid() and public.is_doctor())
  or public.is_admin()
)
with check (
  (patient_id = auth.uid() and status = 'cancelled')
  or (doctor_id = auth.uid() and public.is_doctor())
  or public.is_admin()
);

create or replace function public.validate_appointment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if public.is_admin() then
      if not (
        (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
        or (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
      ) then
        raise exception 'Invalid appointment status transition.';
      end if;
      if new.status = 'cancelled' and new.cancelled_by <> 'admin' then
        raise exception 'Administrator cancellations must identify the administrator.';
      end if;
    elsif auth.uid() = old.patient_id then
      if new.status <> 'cancelled'
        or old.status not in ('pending', 'confirmed')
        or new.cancelled_by <> 'patient' then
        raise exception 'Patients may only cancel pending or confirmed appointments.';
      end if;
    elsif auth.uid() = old.doctor_id and public.is_doctor() then
      if not (
        (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
        or (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
      ) then
        raise exception 'Invalid appointment status transition.';
      end if;
      if new.status = 'cancelled' and new.cancelled_by <> 'doctor' then
        raise exception 'Doctor cancellations must identify the doctor.';
      end if;
    else
      raise exception 'You are not allowed to update this appointment.';
    end if;
  elsif new.cancelled_by is distinct from old.cancelled_by
    or new.cancelled_at is distinct from old.cancelled_at then
    raise exception 'Cancellation details cannot be changed independently.';
  end if;

  if new.status = 'cancelled' then
    if new.cancelled_by is null then
      raise exception 'Cancelled appointments must identify who cancelled them.';
    end if;
    if old.status is distinct from 'cancelled' then
      new.cancelled_at = now();
    end if;
  elsif new.cancelled_by is not null or new.cancelled_at is not null then
    raise exception 'Only cancelled appointments may have cancellation details.';
  end if;
  return new;
end;
$$;

drop policy if exists "Users can read permitted profile photos" on storage.objects;
create policy "Users can read permitted profile photos"
on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-photos'
  and (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    or public.is_admin()
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

drop policy if exists "Users can upload their own profile photos" on storage.objects;
create policy "Users can upload their own profile photos"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    or (
      public.is_admin()
      and exists (
        select 1
        from public.doctors d
        where d.id::text = split_part(storage.objects.name, '/', 1)
      )
    )
  )
);

drop policy if exists "Users can update their own profile photos" on storage.objects;
create policy "Users can update their own profile photos"
on storage.objects
for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    or (
      public.is_admin()
      and exists (
        select 1
        from public.doctors d
        where d.id::text = split_part(storage.objects.name, '/', 1)
      )
    )
  )
)
with check (
  bucket_id = 'profile-photos'
  and (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    or (
      public.is_admin()
      and exists (
        select 1
        from public.doctors d
        where d.id::text = split_part(storage.objects.name, '/', 1)
      )
    )
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'appointments'
    ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end;
$$;
