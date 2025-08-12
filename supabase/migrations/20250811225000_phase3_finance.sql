-- Phase 3 — Devis/Factures + Paiements CinetPay
-- Tables + RLS patterns (admin full, client par appartenance)

-- 1) Devis
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  number text not null unique,
  currency text not null default 'XOF',
  total_ht numeric(14,2) not null default 0,
  total_tva numeric(14,2) not null default 0,
  total_ttc numeric(14,2) not null default 0,
  status text not null default 'draft',
  pdf_url text,
  expires_at date,
  created_at timestamptz default now()
);
alter table public.quotes enable row level security;

create table if not exists public.quote_items (
  id bigint primary key generated always as identity,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  label text not null,
  qty numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 0
);

-- 2) Factures
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  number text not null unique,
  currency text not null default 'XOF',
  total_ht numeric(14,2) not null default 0,
  total_tva numeric(14,2) not null default 0,
  total_ttc numeric(14,2) not null default 0,
  due_date date,
  status text not null default 'issued',
  pdf_url text,
  external_ref text,
  created_at timestamptz default now()
);
alter table public.invoices enable row level security;

create table if not exists public.invoice_items (
  id bigint primary key generated always as identity,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  label text not null,
  qty numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 0
);

-- 3) Paiements & tentatives
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(14,2) not null,
  currency text not null default 'XOF',
  status text not null,
  method text,
  cinetpay_transaction_id text,
  operator_id text,
  paid_at timestamptz,
  raw_payload_json jsonb,
  created_at timestamptz default now()
);
alter table public.payments enable row level security;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  cinetpay_payment_token text,
  cinetpay_payment_url text,
  transaction_id text not null,
  status text not null default 'created',
  channel text,
  amount numeric(14,2) not null,
  currency text not null default 'XOF',
  notify_count int not null default 0,
  created_at timestamptz default now()
);
alter table public.payment_attempts enable row level security;

-- Indexes utiles
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id);
create index if not exists idx_payment_attempts_invoice on public.payment_attempts(invoice_id);
create index if not exists idx_payment_attempts_tx on public.payment_attempts(transaction_id);

-- RLS Policies (exemples minimalistes, affiner selon vos besoins)
-- ADMIN full access via profiles.role = 'admin'
create policy if not exists "admin all on invoices"
on public.invoices for all
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

create policy if not exists "admin all on quotes"
on public.quotes for all
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

create policy if not exists "admin all on payments"
on public.payments for all
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

create policy if not exists "admin all on payment_attempts"
on public.payment_attempts for all
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- CLIENT lecture via appartenance au client propriétaire de la facture
create policy if not exists "member select invoices"
on public.invoices for select
using (exists (
  select 1 from public.client_members cm
  where cm.client_id = invoices.client_id and cm.user_id = auth.uid()
));

create policy if not exists "member select quotes"
on public.quotes for select
using (exists (
  select 1 from public.client_members cm
  where cm.client_id = quotes.client_id and cm.user_id = auth.uid()
));

create policy if not exists "member select payments"
on public.payments for select
using (exists (
  select 1 from public.invoices i
  join public.client_members cm on cm.client_id = i.client_id
  where i.id = payments.invoice_id and cm.user_id = auth.uid()
));

create policy if not exists "member select payment_attempts"
on public.payment_attempts for select
using (exists (
  select 1 from public.invoices i
  join public.client_members cm on cm.client_id = i.client_id
  where i.id = payment_attempts.invoice_id and cm.user_id = auth.uid()
));


