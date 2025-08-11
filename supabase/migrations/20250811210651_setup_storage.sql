-- Configuration Supabase Storage pour documents privés

-- Créer le bucket privé pour les documents de projets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false, -- bucket privé
  52428800, -- 50MB max par fichier
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
);

-- Policies Storage pour le bucket project-files
-- Admin peut tout faire
create policy "admin can manage all files"
  on storage.objects for all
  using ( 
    bucket_id = 'project-files' and 
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') 
  )
  with check ( 
    bucket_id = 'project-files' and 
    exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') 
  );

-- Les membres peuvent voir les fichiers de leurs projets
create policy "members can view project files"
  on storage.objects for select
  using (
    bucket_id = 'project-files' and 
    exists (
      select 1 
      from public.documents d
      join public.projects pr on pr.id = d.project_id
      join public.client_members cm on cm.client_id = pr.client_id
      where d.file_path = storage.objects.name and cm.user_id = auth.uid()
    )
  );

-- Les membres peuvent uploader des fichiers pour leurs projets
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

-- Les membres peuvent supprimer leurs fichiers uploadés
create policy "members can delete own uploaded files"
  on storage.objects for delete
  using (
    bucket_id = 'project-files' and 
    exists (
      select 1 
      from public.documents d
      join public.projects pr on pr.id = d.project_id
      join public.client_members cm on cm.client_id = pr.client_id
      where d.file_path = storage.objects.name 
        and d.uploaded_by = auth.uid() 
        and cm.user_id = auth.uid()
    )
  );
