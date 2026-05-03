create table if not exists public.waitlist_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'homepage_footer',
  language text not null default 'en',
  page text not null default '/',
  created_at timestamptz not null default now()
);

alter table public.waitlist_emails enable row level security;

create index if not exists waitlist_emails_created_at_idx
  on public.waitlist_emails (created_at desc);
