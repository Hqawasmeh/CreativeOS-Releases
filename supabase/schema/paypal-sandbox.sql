-- Sandbox records never grant desktop entitlements or modify public.subscriptions.
create table if not exists public.paypal_sandbox_config (
 key text primary key,
 value jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.paypal_sandbox_config enable row level security;
revoke all on public.paypal_sandbox_config from public, anon, authenticated;
grant all on public.paypal_sandbox_config to service_role;
create table if not exists public.paypal_sandbox_checkouts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 plan text not null check (plan in ('basic','pro','teams')),
 billing text not null check (billing in ('monthly','annual')),
 seats integer not null default 1 check (seats between 1 and 100),
 provider_id text unique,
 status text not null default 'CREATING',
 approval_url text,
 next_billing_time timestamptz,
 last_payment_time timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists paypal_sandbox_one_open_checkout on public.paypal_sandbox_checkouts(user_id) where status not in ('CANCELLED','EXPIRED');
alter table public.paypal_sandbox_checkouts enable row level security;
revoke all on public.paypal_sandbox_checkouts from public, anon, authenticated;
grant select on public.paypal_sandbox_checkouts to authenticated;
grant all on public.paypal_sandbox_checkouts to service_role;
drop policy if exists "Read own PayPal sandbox checkout" on public.paypal_sandbox_checkouts;
create policy "Read own PayPal sandbox checkout" on public.paypal_sandbox_checkouts for select to authenticated using ((select auth.uid())=user_id);
