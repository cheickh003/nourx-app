-- Phase 2: Extension du schéma - Jalons, Tâches, Commentaires, Checklists et Documents étendus

-- 1) Jalons (feuille de route)
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo', -- todo|doing|done|blocked
  due_date date,
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index pour performance
create index if not exists idx_milestones_project_id on public.milestones(project_id);
create index if not exists idx_milestones_status on public.milestones(status);

-- Activer RLS
alter table public.milestones enable row level security;

-- 2) Tâches
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo', -- todo|doing|done|blocked
  priority text not null default 'normal', -- low|normal|high|urgent
  position int not null default 0,        -- pour l'ordre Kanban
  assigned_to uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index pour performance
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_milestone_id on public.tasks(milestone_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);

-- Activer RLS
alter table public.tasks enable row level security;

-- 3) Commentaires de tâches
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index pour performance
create index if not exists idx_task_comments_task_id on public.task_comments(task_id);
create index if not exists idx_task_comments_author_id on public.task_comments(author_id);

-- Activer RLS
alter table public.task_comments enable row level security;

-- 4) Éléments de checklist pour les tâches
create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null,
  is_done boolean not null default false,
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index pour performance
create index if not exists idx_task_checklist_items_task_id on public.task_checklist_items(task_id);

-- Activer RLS
alter table public.task_checklist_items enable row level security;

-- 5) Mettre à jour la table documents pour correspondre aux spécifications Phase 2
-- Renommer les colonnes existantes et ajouter les nouvelles
alter table public.documents 
  rename column name to label;

-- Ajouter les nouvelles colonnes
alter table public.documents 
  add column if not exists storage_bucket text not null default 'project-files',
  add column if not exists storage_path text,
  add column if not exists size_bytes bigint,
  add column if not exists visibility text not null default 'private',
  add column if not exists created_by uuid references public.profiles(user_id),
  add column if not exists updated_at timestamptz default now();

-- Migrer les données existantes
update public.documents 
set 
  storage_path = file_path,
  size_bytes = file_size,
  created_by = uploaded_by
where storage_path is null;

-- Supprimer les anciennes colonnes
alter table public.documents 
  drop column if exists file_path,
  drop column if exists file_size,
  drop column if exists uploaded_by;

-- S'assurer que storage_path n'est pas null
alter table public.documents 
  alter column storage_path set not null;

-- Index pour performance
create index if not exists idx_documents_project_id on public.documents(project_id);
create index if not exists idx_documents_created_by on public.documents(created_by);

-- POLICIES RLS pour les nouvelles tables

-- ===== MILESTONES =====
-- Admin: accès total
create policy "admin all on milestones"
  on public.milestones for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- Client: lecture si membre du client lié au projet
create policy "member select milestones by client membership"
  on public.milestones for select
  using (exists (
    select 1 from public.projects pr
    join public.client_members cm on cm.client_id = pr.client_id
    where pr.id = milestones.project_id and cm.user_id = auth.uid()
  ));

-- Client: mise à jour limitée (optionnelle, selon besoins métier)
create policy "member update milestones by client membership"
  on public.milestones for update
  using (exists (
    select 1 from public.projects pr
    join public.client_members cm on cm.client_id = pr.client_id
    where pr.id = milestones.project_id and cm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects pr
    join public.client_members cm on cm.client_id = pr.client_id
    where pr.id = milestones.project_id and cm.user_id = auth.uid()
  ));

-- ===== TASKS =====
-- Admin: accès total
create policy "admin all on tasks"
  on public.tasks for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- Client: lecture si membre du client lié au projet
create policy "member select tasks by client membership"
  on public.tasks for select
  using (exists (
    select 1 from public.projects pr
    join public.client_members cm on cm.client_id = pr.client_id
    where pr.id = tasks.project_id and cm.user_id = auth.uid()
  ));

-- Client: mise à jour (pour drag & drop Kanban notamment)
create policy "member update tasks by client membership"
  on public.tasks for update
  using (exists (
    select 1 from public.projects pr
    join public.client_members cm on cm.client_id = pr.client_id
    where pr.id = tasks.project_id and cm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects pr
    join public.client_members cm on cm.client_id = pr.client_id
    where pr.id = tasks.project_id and cm.user_id = auth.uid()
  ));

-- Client: création de tâches (optionnelle)
create policy "member insert tasks by client membership"
  on public.tasks for insert
  with check (exists (
    select 1 from public.projects pr
    join public.client_members cm on cm.client_id = pr.client_id
    where pr.id = tasks.project_id and cm.user_id = auth.uid()
  ));

-- ===== TASK_COMMENTS =====
-- Admin: accès total
create policy "admin all on task_comments"
  on public.task_comments for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- Client: lecture si membre du client lié au projet via la tâche
create policy "member select task_comments by client membership"
  on public.task_comments for select
  using (exists (
    select 1 from public.tasks t
    join public.projects pr on pr.id = t.project_id
    join public.client_members cm on cm.client_id = pr.client_id
    where t.id = task_comments.task_id and cm.user_id = auth.uid()
  ));

-- Client: création de commentaires
create policy "member insert task_comments by client membership"
  on public.task_comments for insert
  with check (exists (
    select 1 from public.tasks t
    join public.projects pr on pr.id = t.project_id
    join public.client_members cm on cm.client_id = pr.client_id
    where t.id = task_comments.task_id and cm.user_id = auth.uid()
  ) and task_comments.author_id = auth.uid());

-- Client: mise à jour de ses propres commentaires
create policy "member update own task_comments"
  on public.task_comments for update
  using (task_comments.author_id = auth.uid() and exists (
    select 1 from public.tasks t
    join public.projects pr on pr.id = t.project_id
    join public.client_members cm on cm.client_id = pr.client_id
    where t.id = task_comments.task_id and cm.user_id = auth.uid()
  ))
  with check (task_comments.author_id = auth.uid());

-- ===== TASK_CHECKLIST_ITEMS =====
-- Admin: accès total
create policy "admin all on task_checklist_items"
  on public.task_checklist_items for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- Client: accès si membre du client lié au projet via la tâche
create policy "member access task_checklist_items by client membership"
  on public.task_checklist_items for all
  using (exists (
    select 1 from public.tasks t
    join public.projects pr on pr.id = t.project_id
    join public.client_members cm on cm.client_id = pr.client_id
    where t.id = task_checklist_items.task_id and cm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.tasks t
    join public.projects pr on pr.id = t.project_id
    join public.client_members cm on cm.client_id = pr.client_id
    where t.id = task_checklist_items.task_id and cm.user_id = auth.uid()
  ));

-- Mettre à jour les policies documents existantes pour correspondre aux nouvelles colonnes
drop policy if exists "member can access project documents" on public.documents;
drop policy if exists "member can upload project documents" on public.documents;

create policy "member can access project documents"
  on public.documents for select
  using (exists (
    select 1 from public.client_members cm
    join public.projects pr on pr.client_id = cm.client_id
    where pr.id = documents.project_id and cm.user_id = auth.uid()
  ));

create policy "member can upload project documents"
  on public.documents for insert
  with check (exists (
    select 1 from public.client_members cm
    join public.projects pr on pr.client_id = cm.client_id
    where pr.id = documents.project_id and cm.user_id = auth.uid()
  ) and documents.created_by = auth.uid());

create policy "member can update project documents"
  on public.documents for update
  using (exists (
    select 1 from public.client_members cm
    join public.projects pr on pr.client_id = cm.client_id
    where pr.id = documents.project_id and cm.user_id = auth.uid()
  ) and documents.created_by = auth.uid())
  with check (exists (
    select 1 from public.client_members cm
    join public.projects pr on pr.client_id = cm.client_id
    where pr.id = documents.project_id and cm.user_id = auth.uid()
  ) and documents.created_by = auth.uid());

-- Fonctions utilitaires pour les triggers de mise à jour
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Triggers pour auto-update des timestamps
create trigger update_milestones_updated_at before update on public.milestones
    for each row execute procedure update_updated_at_column();

create trigger update_tasks_updated_at before update on public.tasks
    for each row execute procedure update_updated_at_column();

create trigger update_task_comments_updated_at before update on public.task_comments
    for each row execute procedure update_updated_at_column();

create trigger update_task_checklist_items_updated_at before update on public.task_checklist_items
    for each row execute procedure update_updated_at_column();

create trigger update_documents_updated_at before update on public.documents
    for each row execute procedure update_updated_at_column();

-- Activer le realtime pour les tables principales de la Phase 2
alter publication supabase_realtime add table public.milestones;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.task_checklist_items;
alter publication supabase_realtime add table public.documents;
