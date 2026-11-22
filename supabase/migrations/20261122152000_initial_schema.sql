create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  name text not null default '',
  phone text not null default '',
  role text not null default 'patient' check (role in ('patient', 'doctor')),
  specialty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  patient_name text not null,
  patient_profile_photo text,
  patient_email text not null,
  patient_phone text not null,
  doctor_id uuid not null references public.profiles (id),
  doctor_name text not null,
  service_id text not null,
  service text not null,
  date_label text not null,
  date_iso date not null,
  time_slot text not null,
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  cancelled_by text check (cancelled_by in ('patient', 'doctor')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index appointments_active_doctor_slot
  on public.appointments (doctor_id, date_iso, time_slot)
  where status in ('pending', 'confirmed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.sync_profile_email();

create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'doctor'
  );
$$;

create or replace function public.validate_appointment_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cancelled_by is not null or new.cancelled_at is not null then
    raise exception 'New appointments cannot have cancellation details.';
  end if;
  if not exists (
    select 1
    from public.profiles
    where id = new.doctor_id and role = 'doctor'
  ) then
    raise exception 'Choose an active doctor for this appointment.';
  end if;
  return new;
end;
$$;

create trigger appointments_validate_insert
before insert on public.appointments
for each row execute function public.validate_appointment_insert();

create or replace function public.validate_appointment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if auth.uid() = old.patient_id then
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

create trigger appointments_validate_update
before update on public.appointments
for each row execute function public.validate_appointment_update();

alter table public.profiles enable row level security;
alter table public.appointments enable row level security;

create view public.doctors with (security_invoker = false) as
select id, name, specialty
from public.profiles
where role = 'doctor';

revoke all on public.profiles from anon, authenticated;
revoke all on public.appointments from anon, authenticated;
revoke all on public.doctors from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, name, phone, updated_at)
  on public.profiles to authenticated;
grant select, insert on public.appointments to authenticated;
grant update (status, cancelled_by, cancelled_at, updated_at)
  on public.appointments to authenticated;
grant select on public.doctors to authenticated;
revoke execute on function public.is_doctor() from public, anon;
grant execute on function public.is_doctor() to authenticated;

create policy "Users can view their profile and assigned patients"
on public.profiles
for select to authenticated
using (
  id = auth.uid()
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

create policy "Users can update their own profile"
on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Patients can create their own appointments"
on public.appointments
for insert to authenticated
with check (
  patient_id = auth.uid()
  and not public.is_doctor()
  and status = 'pending'
);

create policy "Patients and assigned doctors can view appointments"
on public.appointments
for select to authenticated
using (
  patient_id = auth.uid()
  or (doctor_id = auth.uid() and public.is_doctor())
);

create policy "Patients and assigned doctors can update appointments"
on public.appointments
for update to authenticated
using (
  patient_id = auth.uid()
  or (doctor_id = auth.uid() and public.is_doctor())
)
with check (
  (patient_id = auth.uid() and status = 'cancelled')
  or (doctor_id = auth.uid() and public.is_doctor())
);
