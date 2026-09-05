create table if not exists public.venue_claims (
  id               uuid        primary key default gen_random_uuid(),
  type             text        not null check (type in ('claim', 'listing')),
  venue_slug       text,
  venue_name       text,
  contact_name     text        not null,
  contact_email    text        not null,
  contact_whatsapp text,
  role_at_venue    text,
  message          text        not null,
  official_website text,
  instagram        text,
  language         text        not null default 'en',
  status           text        not null default 'pending'
                               check (status in ('pending', 'reviewed', 'approved', 'rejected')),
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz,
  admin_notes      text
);

alter table public.venue_claims enable row level security;

create index venue_claims_status_created
  on public.venue_claims (status, created_at desc);

grant select, insert on public.venue_claims to service_role;
