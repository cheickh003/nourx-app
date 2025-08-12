-- Extensions Paramètres (profils + avatars)

-- 1) Colonnes supplémentaires sur profiles
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists preferences jsonb default '{}'::jsonb;

-- 2) Bucket avatars (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB max
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do nothing;

-- Upload/Update/Delete réservés à l'utilisateur sur son propre préfixe `${auth.uid()}/...`
drop policy if exists "users can upload own avatar" on storage.objects;
drop policy if exists "users can update own avatar" on storage.objects;
drop policy if exists "users can delete own avatar" on storage.objects;

create policy "users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (name like (auth.uid()::text || '/%'))
  );

create policy "users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (name like (auth.uid()::text || '/%'))
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (name like (auth.uid()::text || '/%'))
  );

create policy "users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (name like (auth.uid()::text || '/%'))
  );


