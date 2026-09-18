# Calltime Supabase Phase 1

The base schema is `schema/calltime_schema.sql`. Phase 1 additions are in
`migrations/202609180001_phase1_mvp.sql`.

## Deploy

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy generate-personal-link --no-verify-jwt
supabase functions deploy personal-profile --no-verify-jwt
```

The hosted Edge Function runtime supplies the Supabase URL and server keys.
Never place a service-role or secret key in the Vite application.

Personal links use the dashboard request origin automatically, so they work on
localhost, Vercel previews, and production. To force one canonical domain, set
`PUBLIC_SITE_URL` as an Edge Function secret before generating links.

## Create the first administrator

Open `/dashboard`, choose **Use a magic link instead**, and sign in with the
operations owner's email. The first authenticated user is bootstrapped as the
workspace super admin. Later users receive no automatic access and must be
added explicitly by that administrator.

## CSV roster format

```csv
full_name,email,phone,role,role_type,organization
Nadia Al-Harbi,nadia@example.com,+966500000000,Tour Manager,crew,Horizon Live
```

The importer reuses an existing CT Global ID when its email already exists.
