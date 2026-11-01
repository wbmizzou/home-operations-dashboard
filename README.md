# Home Operations Dashboard

Track projects, improvements and maintenance on our house. Next.js + Tailwind, Supabase (auth + Postgres), deployed on Vercel. Theme: *Sylvan Ramble*.

## Setup
1. Copy `.env.example` to `.env.local` and fill in the Supabase anon/publishable key.
2. `npm install && npm run dev`
3. Database schema lives in `supabase/migrations/`. Sign-ups are limited to the emails in the `allowed_emails` table.

## Vercel
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables, then import this repo.
In Supabase > Authentication > URL Configuration, add the Vercel URL as the Site URL.

## Priorities
P1 Protect the house · P2 Prevent deterioration · P3 Restore the landscape · P4 Improve enjoyment · P5 Longer-term upgrades
