-- Phase 5 — Coordonnées organisation et clients (PDF/en-tête/pied)

-- Table paramètres d'organisation
create table if not exists public.org_settings (
  id bigserial primary key,
  name text not null default 'NOURX',
  address text,
  phone text,
  email text,
  website text,
  legal text,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(user_id)
);

alter table public.org_settings enable row level security;

-- Lecture par tout utilisateur authentifié (nécessaire pour PDF côté serveur)
drop policy if exists "org_settings_select_auth" on public.org_settings;
create policy "org_settings_select_auth"
  on public.org_settings for select to authenticated
  using (true);

-- Écriture réservée aux admins
drop policy if exists "org_settings_write_admin" on public.org_settings;
create policy "org_settings_write_admin"
  on public.org_settings for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));

-- Insérer une ligne par défaut si vide
insert into public.org_settings (name)
select 'NOURX'
where not exists (select 1 from public.org_settings);

-- Etendre clients
alter table public.clients
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists website text,
  add column if not exists legal text;

-- Politique: les membres peuvent mettre à jour leur client
drop policy if exists "client_members_update_their_client" on public.clients;
create policy "client_members_update_their_client"
  on public.clients for update to authenticated
  using (exists (select 1 from public.client_members cm where cm.client_id = clients.id and cm.user_id = auth.uid()))
  with check (exists (select 1 from public.client_members cm where cm.client_id = clients.id and cm.user_id = auth.uid()));


