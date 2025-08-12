-- Policies pour les canaux Realtime Broadcast privés (Phase 2)

-- Policy pour autoriser l'accès aux canaux project:{id}:* uniquement aux membres du client propriétaire
create policy "project members can access project channels"
  on realtime.messages for all
  using (
    -- Admin peut accéder à tous les canaux
    (exists (
      select 1 from public.profiles p 
      where p.user_id = auth.uid() and p.role = 'admin'
    )) 
    or
    -- Les membres peuvent accéder aux canaux de leurs projets
    (
      topic ~ '^project:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:.*$'
      and exists (
        select 1 
        from public.projects pr
        join public.client_members cm on cm.client_id = pr.client_id
        where 
          pr.id::text = substring(topic from 9 for 36)  -- Extraire l'UUID du project du topic
          and cm.user_id = auth.uid()
      )
    )
  )
  with check (
    -- Admin peut écrire dans tous les canaux
    (exists (
      select 1 from public.profiles p 
      where p.user_id = auth.uid() and p.role = 'admin'
    )) 
    or
    -- Les membres peuvent écrire dans les canaux de leurs projets
    (
      topic ~ '^project:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:.*$'
      and exists (
        select 1 
        from public.projects pr
        join public.client_members cm on cm.client_id = pr.client_id
        where 
          pr.id::text = substring(topic from 9 for 36)  -- Extraire l'UUID du project du topic
          and cm.user_id = auth.uid()
      )
    )
  );
