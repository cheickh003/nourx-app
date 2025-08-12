-- Phase 4: Réclamations (tickets) & Notifications — Schéma + RLS + Storage + Realtime

-- 1) Paramètres
create table if not exists public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  label text not null unique
);

create table if not exists public.ticket_priorities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- low|normal|high|urgent
  response_sla_minutes int not null,   -- temps cible 1ère réponse
  resolve_sla_minutes  int not null    -- temps cible résolution
);

-- 2) Tickets (réclamations)
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  category_id uuid references public.ticket_categories(id) on delete set null,
  priority_id uuid references public.ticket_priorities(id) on delete set null,
  subject text not null,
  status text not null default 'open',     -- open|in_progress|waiting_customer|resolved|closed
  first_response_due_at timestamptz,
  resolve_due_at timestamptz,
  last_customer_activity timestamptz,
  last_admin_activity timestamptz,
  created_by uuid references public.profiles(user_id),  -- client ou admin
  created_at timestamptz default now()
);
alter table public.tickets enable row level security;

create index if not exists idx_tickets_client on public.tickets(client_id);
create index if not exists idx_tickets_project on public.tickets(project_id);
create index if not exists idx_tickets_status on public.tickets(status);

-- 3) Messages du ticket (fil de discussion)
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id),
  body text not null,
  visibility text not null default 'public',   -- public|internal (admin only)
  created_at timestamptz default now()
);
alter table public.ticket_messages enable row level security;

create index if not exists idx_ticket_messages_ticket on public.ticket_messages(ticket_id);
create index if not exists idx_ticket_messages_author on public.ticket_messages(author_id);

-- 4) Pièces jointes (métadonnées, fichiers dans Storage)
create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  label text,
  storage_bucket text not null default 'project-files',
  storage_path text not null,     -- ex: tickets/{ticket_id}/{uuid-filename}
  mime_type text,
  size_bytes bigint,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now()
);
alter table public.ticket_attachments enable row level security;

create index if not exists idx_ticket_attachments_ticket on public.ticket_attachments(ticket_id);
create index if not exists idx_ticket_attachments_path on public.ticket_attachments(storage_path);

-- 5) Journal d'e-mails
create table if not exists public.email_events (
  id bigint primary key generated always as identity,
  ticket_id uuid references public.tickets(id) on delete cascade,
  event_type text not null,            -- ticket.created | ticket.message.created | ticket.status.changed | sla.reminder
  recipient text not null,
  status text not null,                -- queued|sent|failed
  provider_id text,
  payload_excerpt text,
  created_at timestamptz default now()
);
alter table public.email_events enable row level security;

-- =========================
-- RLS Policies
-- =========================

-- ADMIN helper predicate
-- N.B.: On réutilise le motif partout via EXISTS

-- tickets
create policy if not exists "admin all on tickets"
  on public.tickets for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

create policy if not exists "member select tickets by client membership"
  on public.tickets for select
  using (exists (
    select 1 from public.client_members cm
    where cm.client_id = tickets.client_id and cm.user_id = auth.uid()
  ));

create policy if not exists "member insert tickets by client membership"
  on public.tickets for insert
  with check (exists (
    select 1 from public.client_members cm
    where cm.client_id = tickets.client_id and cm.user_id = auth.uid()
  ));

create policy if not exists "member update tickets by client membership"
  on public.tickets for update
  using (exists (
    select 1 from public.client_members cm
    where cm.client_id = tickets.client_id and cm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.client_members cm
    where cm.client_id = tickets.client_id and cm.user_id = auth.uid()
  ));

-- ticket_messages
create policy if not exists "admin all on ticket_messages"
  on public.ticket_messages for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- Clients: SELECT uniquement messages publics de leurs tickets
create policy if not exists "member select public ticket_messages"
  on public.ticket_messages for select
  using (
    visibility = 'public' and exists (
      select 1 from public.tickets t
      join public.client_members cm on cm.client_id = t.client_id
      where t.id = ticket_messages.ticket_id and cm.user_id = auth.uid()
    )
  );

-- Clients: INSERT seulement sur messages publics et auteur = uid
create policy if not exists "member insert public ticket_messages"
  on public.ticket_messages for insert
  with check (
    ticket_messages.visibility = 'public' and ticket_messages.author_id = auth.uid() and exists (
      select 1 from public.tickets t
      join public.client_members cm on cm.client_id = t.client_id
      where t.id = ticket_messages.ticket_id and cm.user_id = auth.uid()
    )
  );

-- ticket_attachments
create policy if not exists "admin all on ticket_attachments"
  on public.ticket_attachments for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

create policy if not exists "member select ticket_attachments by client membership"
  on public.ticket_attachments for select
  using (exists (
    select 1 from public.tickets t
    join public.client_members cm on cm.client_id = t.client_id
    where t.id = ticket_attachments.ticket_id and cm.user_id = auth.uid()
  ));

create policy if not exists "member insert ticket_attachments by client membership"
  on public.ticket_attachments for insert
  with check (exists (
    select 1 from public.tickets t
    join public.client_members cm on cm.client_id = t.client_id
    where t.id = ticket_attachments.ticket_id and cm.user_id = auth.uid()
  ) and ticket_attachments.created_by = auth.uid());

-- email_events
create policy if not exists "admin all on email_events"
  on public.email_events for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- =========================
-- Storage policies pour attachments des tickets (bucket project-files)
-- =========================

-- Lecture: membres des clients liés au ticket
create policy if not exists "members can view ticket files"
  on storage.objects for select
  using (
    bucket_id = 'project-files' and 
    exists (
      select 1
      from public.ticket_attachments ta
      join public.tickets t on t.id = ta.ticket_id
      join public.client_members cm on cm.client_id = t.client_id
      where ta.storage_path = storage.objects.name and cm.user_id = auth.uid()
    )
  );

-- Upload: membres des clients liés au ticket
create policy if not exists "members can upload ticket files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files' and 
    exists (
      select 1
      from public.tickets t
      join public.client_members cm on cm.client_id = t.client_id
      where cm.user_id = auth.uid()
    )
  );

-- Suppression: créateur du fichier ou admin
create policy if not exists "members can delete own ticket files"
  on storage.objects for delete
  using (
    bucket_id = 'project-files' and 
    (
      exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin')
      or exists (
        select 1
        from public.ticket_attachments ta
        join public.tickets t on t.id = ta.ticket_id
        join public.client_members cm on cm.client_id = t.client_id
        where ta.storage_path = storage.objects.name 
          and ta.created_by = auth.uid() 
          and cm.user_id = auth.uid()
      )
    )
  );

-- =========================
-- Realtime
-- =========================
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_messages;

-- =========================
-- Données de référence (priorités & catégories de base)
-- =========================
insert into public.ticket_priorities (code, response_sla_minutes, resolve_sla_minutes)
values
  ('low', 1440, 4320),         -- 1j / 3j
  ('normal', 480, 1440),       -- 8h / 1j
  ('high', 120, 480),          -- 2h / 8h
  ('urgent', 30, 240)          -- 30min / 4h
on conflict (code) do nothing;

insert into public.ticket_categories (label)
values ('Général'), ('Facturation'), ('Technique'), ('Projet')
on conflict (label) do nothing;


