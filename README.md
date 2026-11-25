# Dental App

A mobile application developed as a final project for Mobile Programming using React Native and Expo.

## Technologies Used
- React Native
- Expo
- JavaScript
- Supabase Auth and Postgres

## Supabase setup

1. Copy `.env.example` to `.env.local` and fill in the project's URL and publishable key from Supabase **Project Settings → API**. Never put a `service_role` key in the app.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261122152000_initial_schema.sql`](./supabase/migrations/20261122152000_initial_schema.sql) if you have not already applied it.
3. Run [`supabase/migrations/20261123003000_profile_photo_storage.sql`](./supabase/migrations/20261123003000_profile_photo_storage.sql) to add private profile-photo storage. Existing on-device photos are not uploaded automatically; each user must choose their photo again to share it.
4. Run [`supabase/migrations/20261123005000_doctor_profile_photos.sql`](./supabase/migrations/20261123005000_doctor_profile_photos.sql) so patients can see doctor profile photos when choosing a dentist.
5. Run [`supabase/migrations/20261126070000_admin_and_live_appointments.sql`](./supabase/migrations/20261126070000_admin_and_live_appointments.sql) to enable the in-app clinic dashboard, secure administrator permissions, and appointment change notifications.
6. In Supabase **Authentication → Providers**, enable email/password sign-in. Email confirmation may remain enabled; new patients will be prompted to confirm before signing in.
7. In Supabase **Authentication → URL Configuration**, add `dental-app://login` and `dental-app://reset-password` to the allowed redirect URLs for email confirmation and password resets.
8. Create each clinic doctor as a user in the app. The account starts as a patient. An administrator can promote the account to a dentist and add its specialty in the app's **Dentists** section. Do not let users choose their role during sign-up.

   To provision the clinic's first administrator, create a regular account for that person, then run this one-time statement in the Supabase SQL Editor (replace the email):

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'clinic-admin@example.com';
   ```

   Administrator access is intentionally not self-service: only the initial account needs this one-time database step. After that, clinic staff can review all bookings, change appointment statuses, promote existing accounts to dentists, update dentist specialties, and manage dentist profile photos in the app. Creating login accounts still happens through the normal sign-up flow.
9. Restart Expo after setting environment variables: `npx expo start -c`.

For EAS builds, also define `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the EAS environment used by the build.

The app stores authentication, appointments, and profile photos in Supabase; row-level security limits patients to their own appointments and photos, doctors to appointments and photos for their assigned patients, and administrators to clinic operations. Appointment changes synchronize live between signed-in users; appointment lists can also be refreshed by pulling down. A saved light/dark appearance toggle is available from the dashboard or profile. The existing on-device accounts and appointments are not imported: users need to register again.
