-- Phase 1: Schéma de base de données core avec RLS

-- 1) Profils (lié à auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','client')),
  full_name text,
  phone text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- 2) Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  created_at timestamptz default now()
);
alter table public.clients enable row level security;

-- 3) Liaison utilisateur ↔ client
create table if not exists public.client_members (
  id bigint primary key generated always as identity,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  is_primary boolean default false,
  unique (user_id, client_id)
);
alter table public.client_members enable row level security;

-- 4) Projets
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  progress int not null default 0 check (progress between 0 and 100),
  created_at timestamptz default now()
);
alter table public.projects enable row level security;

-- 5) Table pour documents (Phase 2, mais on pose la structure)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  file_path text not null,
  file_size int,
  mime_type text,
  uploaded_by uuid references public.profiles(user_id),
  created_at timestamptz default now()
);
alter table public.documents enable row level security;

-- 6) Logs d'audit (transverse)
create table if not exists public.audit_logs (
  id bigint primary key generated always as identity,
  user_id uuid references public.profiles(user_id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb,
  created_at timestamptz default now()
);
alter table public.audit_logs enable row level security;

-- POLICIES RLS

-- Profiles: utilisateurs peuvent lire/modifier leur profil; admin peut tout
create policy "admin can all on profiles"
  on public.profiles for all
  using ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') )
  with check ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') );

create policy "user can read own profile"
  on public.profiles for select
  using ( profiles.user_id = auth.uid() );

create policy "user can update own profile"
  on public.profiles for update
  using ( profiles.user_id = auth.uid() )
  with check ( profiles.user_id = auth.uid() );

-- Clients: admin peut tout; client peut lire ses clients via membership
create policy "admin can all on clients"
  on public.clients for all
  using ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') )
  with check ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') );

create policy "member can select own clients"
  on public.clients for select
  using ( exists (
    select 1 from public.client_members cm
    where cm.client_id = clients.id and cm.user_id = auth.uid()
  ));

-- client_members: admin peut tout; utilisateur peut lire ses liaisons
create policy "admin can all on client_members"
  on public.client_members for all
  using ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') )
  with check ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') );

create policy "user can read own memberships"
  on public.client_members for select
  using ( client_members.user_id = auth.uid() );

-- Projects: admin peut tout; client peut voir/modifier ses projets
create policy "admin can all on projects"
  on public.projects for all
  using ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') )
  with check ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') );

create policy "member can select own projects"
  on public.projects for select
  using ( exists (
    select 1 from public.client_members cm
    where cm.client_id = projects.client_id and cm.user_id = auth.uid()
  ));

create policy "member can update own projects controlled"
  on public.projects for update
  using ( exists (
    select 1 from public.client_members cm
    where cm.client_id = projects.client_id and cm.user_id = auth.uid()
  ))
  with check (true); -- ajuster selon scope d'édition côté client

-- Documents: mêmes principes que projets
create policy "admin can all on documents"
  on public.documents for all
  using ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') )
  with check ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') );

create policy "member can access project documents"
  on public.documents for select
  using ( exists (
    select 1 from public.client_members cm
    join public.projects pr on pr.client_id = cm.client_id
    where pr.id = documents.project_id and cm.user_id = auth.uid()
  ));

create policy "member can upload project documents"
  on public.documents for insert
  with check ( exists (
    select 1 from public.client_members cm
    join public.projects pr on pr.client_id = cm.client_id
    where pr.id = documents.project_id and cm.user_id = auth.uid()
  ));

-- Audit logs: admin peut tout; utilisateurs peuvent voir leurs actions
create policy "admin can all on audit_logs"
  on public.audit_logs for all
  using ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') )
  with check ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') );

create policy "user can read own audit logs"
  on public.audit_logs for select
  using ( audit_logs.user_id = auth.uid() );

-- Fonction pour créer automatiquement un profil lors de l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, role, full_name)
  values (new.id, 'client', new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- Trigger pour créer automatiquement le profil
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Activer Realtime pour les tables principales (optionnel pour Phase 1)
-- alter publication supabase_realtime add table public.projects;
-- alter publication supabase_realtime add table public.client_members;
