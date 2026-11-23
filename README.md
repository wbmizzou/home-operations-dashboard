# Home Operations Dashboard

Track projects, improvements and maintenance on our house. Next.js + Tailwind, Supabase (auth + Postgres), deployed on Vercel. Theme: *Sylvan Ramble*.

## Setup
1. Copy `.env.example` to `.env.local` and fill in the Supabase anon/publishable key.
2. `npm install && npm run dev`
3. Database schema lives in `supabase/migrations/`. Apply changes only through new migration files (`supabase db push`), so production always matches the repo.

## Access model
Anyone can sign up and start their own household. Row-level security limits every signed-in user to their own household's data.
- **Joining:** a household's invite code is 12 characters, works for one person, and expires after 14 days. Repeated wrong guesses are throttled.
- **Owners vs members:** only the owner can rename the household, make a new invite code, remove members, or delete a project forever (from Recently deleted). Everyone else's deletes wait 30 days.
- **Two-step sign-in:** optional per person (Settings). Once it's on, a password-only session can't read or change any data.
- **Activity log:** joins, removals, renames, new codes, deletes and restores show in Settings → Recent activity.

## Supabase settings (dashboard, not in code)
- Authentication → Sign In / Providers → Email: **Confirm email** on, **minimum password length 8+**, **Prevent use of leaked passwords** on.
- Authentication → Multi-Factor: **TOTP** enabled (on by default).
- Authentication → Attack Protection: consider CAPTCHA (Turnstile/hCaptcha) if spam sign-ups appear.

## Vercel
Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `CRON_SECRET` (any long random string; Vercel Cron sends it to `/api/keepalive`) as environment variables, then import this repo.
In Supabase > Authentication > URL Configuration, add the Vercel URL as the Site URL.

## Priorities
P1 Protect the house · P2 Prevent deterioration · P3 Restore the landscape · P4 Improve enjoyment · P5 Longer-term upgrades
