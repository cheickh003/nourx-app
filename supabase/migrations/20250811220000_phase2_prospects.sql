-- Prospects (Phase 2 complément UI admin)
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  status text not null default 'new' check (status in ('new','contacted','qualified')),
  source text,
  notes text,
  created_at timestamptz default now()
);
alter table public.prospects enable row level security;

-- Policies
create policy "admin all on prospects"
on public.prospects for all
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));


