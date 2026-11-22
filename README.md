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
5. In Supabase **Authentication → Providers**, enable email/password sign-in. Email confirmation may remain enabled; new patients will be prompted to confirm before signing in.
6. In Supabase **Authentication → URL Configuration**, add `dental-app://login` and `dental-app://reset-password` to the allowed redirect URLs for email confirmation and password resets.
7. Create each clinic doctor as a user in **Authentication → Users**. The database trigger creates a patient profile by default. Promote the account using the SQL Editor, replacing the email and specialty:

   ```sql
   update public.profiles
   set role = 'doctor',
       first_name = 'Mia',
       last_name = 'Santos',
       name = 'Dr. Mia Santos',
       specialty = 'General Dentistry'
   where id = (
     select id from auth.users where email = 'doctor@example.com'
   );
   ```

   Repeat for each doctor. Do not let users choose their role in the app.
8. Restart Expo after setting environment variables: `npx expo start -c`.

For EAS builds, also define `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the EAS environment used by the build.

The app stores authentication, appointments, and profile photos in Supabase; row-level security limits patients to their own appointments and photos, and doctors to appointments and photos for their assigned patients. The existing on-device accounts and appointments are not imported: patients need to register again, and doctor accounts must be created and promoted as described above.
