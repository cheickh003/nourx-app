-- Mise à jour des policies Storage pour correspondre à la nouvelle structure documents (Phase 2)

-- Supprimer les anciennes policies
drop policy if exists "members can view project files" on storage.objects;
drop policy if exists "members can upload project files" on storage.objects;
drop policy if exists "members can delete own uploaded files" on storage.objects;

-- Nouvelle policy: Les membres peuvent voir les fichiers de leurs projets
create policy "members can view project files"
  on storage.objects for select
  using (
    bucket_id = 'project-files' and 
    exists (
      select 1 
      from public.documents d
      join public.projects pr on pr.id = d.project_id
      join public.client_members cm on cm.client_id = pr.client_id
      where d.storage_path = storage.objects.name and cm.user_id = auth.uid()
    )
  );

-- Nouvelle policy: Les membres peuvent uploader des fichiers pour leurs projets
create policy "members can upload project files"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files' and 
    exists (
      select 1 
      from public.projects pr
      join public.client_members cm on cm.client_id = pr.client_id
      where cm.user_id = auth.uid()
      -- La validation du projet spécifique sera faite au niveau applicatif
    )
  );

-- Nouvelle policy: Les membres peuvent supprimer leurs fichiers uploadés
create policy "members can delete own uploaded files"
  on storage.objects for delete
  using (
    bucket_id = 'project-files' and 
    exists (
      select 1 
      from public.documents d
      join public.projects pr on pr.id = d.project_id
      join public.client_members cm on cm.client_id = pr.client_id
      where d.storage_path = storage.objects.name 
        and d.created_by = auth.uid() 
        and cm.user_id = auth.uid()
    )
  );
