# Phase 2 — Projets, Feuille de route, Tâches, Documents

**Cible :** livrer tout le** ** **CRUD** , la** ****synchro temps réel** utile et** ****l’upload sécurisé** des documents pour l’espace client et l’admin, en s’appuyant sur** ****Next.js (App Router + Route Handlers + Server Actions)** et** ** **Supabase (Postgres + RLS + Realtime + Storage)** . ([Next.js](https://nextjs.org/docs/app?utm_source=chatgpt.com "Next.js Docs: App Router"))

---

## 1) Objectifs fonctionnels (Phase 2)

* **Projets** : création/édition/archivage, progression (%), statut, dates clés, rattachement client.
* **Feuille de route (jalons)** : jalons datés, état, avancement, notes.
* **Tâches** : liste &** ****Kanban drag-and-drop** (états), affectation interne (optionnelle), priorité, commentaires, checklists.
* **Documents** :** ****upload** sécurisé, prévisualisation/téléchargement via** ** **URL signée** , suppression/renommage.
* **Temps réel** : mise à jour auto des listes (Projets/Tâches/Jalons/Commentaires) + (optionnel) channel « typing »/toasts via** ** **Broadcast** .
* **Admin** : même périmètre en gestion globale (tous clients).

**Remarques techniques :**

* Mutations via** ****Server Actions** (sécurisées côté serveur).** ****API** complémentaires en** ****Route Handlers** pour uploads & webhooks. ([Next.js](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations?utm_source=chatgpt.com "Server Actions and Mutations - Data Fetching"))
* **Realtime** : pour des canaux privés/broadcast, l’autorisation passe par des** ****policies RLS** sur** **`realtime.messages`. Pour les « Postgres Changes », on reste borné par les** ****policies RLS** des tables. ([Supabase](https://supabase.com/docs/guides/realtime/authorization?utm_source=chatgpt.com "Realtime Authorization | Supabase Docs"))
* **Storage** : lecture via** ****URLs signées** (durée limitée) ; upload via session (RLS)** ****ou** via** ****signed upload URL** (utile pour gros fichiers). ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))

---

## 2) Schéma de données (SQL — migrations Supabase)

> Vous avez déjà** **`profiles`,** **`clients`,** **`client_members`,** **`projects` (Phase 1). On ajoute :** **`milestones`,** **`tasks`,** **`task_comments`,** **`task_checklist_items`,** **`documents`. On** ****active RLS** et on écrit les** ****policies** :
>
> * **Admin** (role =** **`admin`) : accès total.
> * **Client** : accès limité aux lignes liées à** ****ses** `client_id` via** **`client_members`. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

**Tables (extrait synthétique)**

```sql
-- 1) Jalons (feuille de route)
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo', -- todo|doing|done|blocked
  due_date date,
  position int not null default 0,
  created_at timestamptz default now()
);
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
  created_at timestamptz default now()
);
alter table public.tasks enable row level security;

-- 3) Commentaires
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id),
  body text not null,
  created_at timestamptz default now()
);
alter table public.task_comments enable row level security;

-- 4) Checklists
create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null,
  is_done boolean not null default false,
  position int not null default 0
);
alter table public.task_checklist_items enable row level security;

-- 5) Documents (métadonnées liées au Storage)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  storage_bucket text not null default 'project-files',
  storage_path text not null, -- 'project-{project_id}/{uuid-filename}'
  mime_type text,
  size_bytes bigint,
  visibility text not null default 'private',
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now()
);
alter table public.documents enable row level security;
```

**Policies (pattern) – admin full / client par appartenance**

> Exemple pour** **`tasks` (décliner sur** **`milestones`,** **`task_comments`,** **`task_checklist_items`,** **`documents`) :

```sql
-- ADMIN: all actions
create policy "admin all on tasks"
on public.tasks for all
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- CLIENT: lecture si membre du client lié au projet
create policy "member select tasks by client membership"
on public.tasks for select
using (exists (
  select 1 from public.projects pr
  join public.client_members cm on cm.client_id = pr.client_id
  where pr.id = tasks.project_id and cm.user_id = auth.uid()
));

-- (optionnel) Insertion/Update contrôlées côté client (souvent non autorisées ; sinon limiter champs)
```

**Rappels clés** : RLS s’évalue** ****dans Postgres** pour l’utilisateur courant (JWT Supabase) ; l’**admin** peut « bypass RLS » via rôle/service côté serveur** ** **jamais exposé au client** . ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

---

## 3) Realtime (listes, commentaires, Kanban)

* **Postgres Changes** : s’abonner aux changements de** **`projects`,** **`milestones`,** **`tasks`,** **`task_comments` pour refléter les mises à jour en live (RLS toujours appliqué).
* **Broadcast privé** (optionnel) : canaux** **`project:{id}:comments` pour « typing », toasts temps réel, etc.** ****Autorisation** par policies sur** **`realtime.messages` (accès réservé aux membres du client du projet). ([Supabase](https://supabase.com/docs/guides/realtime/concepts?utm_source=chatgpt.com "Realtime Concepts | Supabase Docs"))

> **À faire** : créer une** ****policy** sur** **`realtime.messages` qui autorise la connexion à un topic** **`project:{id}:*`uniquement si l’utilisateur est membre du client propriétaire du** **`project_id`. ([Supabase](https://supabase.com/docs/guides/realtime/authorization?utm_source=chatgpt.com "Realtime Authorization | Supabase Docs"))

---

## 4) Storage & Upload sécurisé (documents)

* **Bucket** :** **`project-files` ( **private** ).
* **Lecture** : générer** ****URLs signées** côté serveur pour l’UI (expiration courte, ex. 5–15 min). ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
* **Upload** : deux approches officielles
  1. **Upload authentifié** via** **`supabase.storage.from('project-files').upload(...)` (simple, respecte RLS).
  2. **Signed Upload URL** générée côté serveur → upload direct (utile pour gros fichiers, liens valables** ** **2 h** ). ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl?utm_source=chatgpt.com "JavaScript: Create signed upload URL"))

**Policy Storage (pattern recommandé)**

* On limite** **`storage.objects` **par l’existence** d’un enregistrement** **`documents(project_id, storage_path)`appartenant à un client de l’utilisateur (via join).
* La** ****suppression** d’un fichier doit supprimer la ligne** **`documents` (et inversement via un** ****trigger** d’hygiène si nécessaire). ([Supabase](https://supabase.com/docs/guides/database/postgres/triggers?utm_source=chatgpt.com "Postgres Triggers | Supabase Docs"))

**Téléversement (Route Handler — Next.js)**

* Créer** **`POST /api/documents/upload` :
  * Vérifier l’auth (session SSR).
  * Recevoir** **`FormData` (fichier +** **`project_id`), générer un nom de fichier,** ****uploader** via SDK (ou renvoyer une** ****signed upload URL** puis confirmer l’insert** **`documents`).** ** **Les Route Handlers gèrent nativement** **`formData()`** . ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))

---

## 5) API interne & Server Actions (patrons)

* **Server Actions** (mutations formulaires) pour : create/update/delete** **`projects`,** **`milestones`,** **`tasks`,** **`task_comments`,** **`documents` (métadonnées). Elles s’exécutent** ****sur le serveur** et simplifient le flux formulaire. ([Next.js](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations?utm_source=chatgpt.com "Server Actions and Mutations - Data Fetching"))
* **Route Handlers** pour :
  * **Upload** (cf. ci-dessus),
  * **Listes paginées** (si besoin),
  * **Exports** (PDF plus tard),
  * **Broadcast** (si vous poussez des événements custom). ([Next.js](https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware?utm_source=chatgpt.com "Getting Started: Route Handlers and Middleware"))

---

## 6) UI/UX (composants & interactions)

* **Projets** : table (tri, recherche), fiche projet (KPIs, progression, jalons & docs récents).
* **Feuille de route** : timeline des jalons, filtres par statut, drag pour réordonner (option).
* **Tâches** :** ****Kanban** (colonnes = statut), drag-and-drop** ****dnd-kit** (performant, moderne), vue liste compacte, détails dans** ** **Sheet/Dialog** , commentaires en temps réel. ([dndkit.com](https://dndkit.com/?utm_source=chatgpt.com "dnd kit – a modern drag and drop toolkit for React"))
* **Documents** : zone** ****drag-and-drop** (upload), liste (nom, taille, date), actions (copier lien signé, télécharger, supprimer).
* **Design** : N/B 90 %,** ****badges** colorés pour statuts/priorités, focus visible, a11y clavier.

---

## 7) Étapes opératoires (checklist)

1. **Migrations** : ajouter tables + activer** ****RLS** + écrire policies (admin bypass / client par appartenance).** ** **`supabase migration new/up`** . ([Supabase](https://supabase.com/docs/guides/database/functions?utm_source=chatgpt.com "Database Functions | Supabase Docs"))
2. **Realtime** :
   * Mettre en place abonnements « Postgres Changes » (projects/milestones/tasks/comments).
   * (Optionnel)** ****Broadcast** : créer topics** **`project:{id}:*` +** ****policy** `realtime.messages`. ([Supabase](https://supabase.com/docs/guides/realtime/concepts?utm_source=chatgpt.com "Realtime Concepts | Supabase Docs"))
3. **Storage** : bucket** **`project-files` privé + policies** **`storage.objects` (liaison à** **`documents`).** ****Lecture via signed URL** ; (optionnel)** ** **signed upload URL** . ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
4. **Next.js** :
   * **Server Actions** pour CRUD (Projets/Jalons/Tâches/Commentaires/Docs). ([Next.js](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations?utm_source=chatgpt.com "Server Actions and Mutations - Data Fetching"))
   * **Route Handlers** :** **`/api/documents/upload` (formData), endpoints utilitaires. ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))
5. **UI** : tables (shadcn), Dialog/Sheet pour créer/éditer,** ** **Kanban dnd-kit** , zone d’upload. ([dndkit.com](https://dndkit.com/?utm_source=chatgpt.com "dnd kit – a modern drag and drop toolkit for React"))
6. **Seed** : script de données de démo (1 client, 1 projet, 3 jalons, 10 tâches, 3 docs).
7. **Sécurité** : vérifier qu’un client A ne voit** ****rien** du client B ;** ****admin** voit tout (tests croisés). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

---

## 8) Critères d’acceptation (mesurables)

* **CRUD complet** pour** **`projects`,** **`milestones`,** **`tasks`,** **`task_comments`,** **`documents` (UI + DB).
* **Kanban** fonctionnel (drag-and-drop) avec** ** **persistance ordre/colonne** . ([dndkit.com](https://dndkit.com/?utm_source=chatgpt.com "dnd kit – a modern drag and drop toolkit for React"))
* **Realtime actif** : ajout/édition/suppression reflétés en live** ****sans recharger** (au moins Tasks & Comments). ([Supabase](https://supabase.com/docs/guides/realtime/concepts?utm_source=chatgpt.com "Realtime Concepts | Supabase Docs"))
* **Upload** : un client peut téléverser un fichier vers un projet** ** **dont il est membre** , le voir listé,** ** **le télécharger via URL signée** , et le supprimer (RLS respectée). ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
* **RLS** :
  * Un client** ****ne peut pas** accéder à un projet/tâche/jalon/document d’un autre client.
  * L’**admin** peut tout voir/éditer via rôle serveur. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

---

## 9) Tests & QA

* **Unitaires SQL** : policies RLS (SELECT cross-client doit échouer), triggers d’hygiène (si ajoutés). ([Supabase](https://supabase.com/docs/guides/database/postgres/triggers?utm_source=chatgpt.com "Postgres Triggers | Supabase Docs"))
* **Intégration** : Server Actions (création tâche → visible en liste), upload document → ligne** **`documents` créée,** ****signed URL** fonctionne. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
* **E2E (Playwright)** :
  * Client se connecte → voit** ****uniquement** son projet.
  * Déplace une tâche en** ****drag-and-drop** → statut/position persistés.
  * Ajoute un commentaire → visible en** ****temps réel** sur un autre client connecté. ([Supabase](https://supabase.com/docs/guides/realtime/concepts?utm_source=chatgpt.com "Realtime Concepts | Supabase Docs"))

---

## 10) Risques & parades

* **Confusion Realtime (Broadcast vs DB Changes)** → pour les notifications éphémères, utiliser** ****Broadcast** et écrire des** ****policies sur** **`realtime.messages`** ; pour les listes, préférer** ****Postgres Changes** (respecte RLS des tables). ([Supabase](https://supabase.com/docs/guides/realtime/authorization?utm_source=chatgpt.com "Realtime Authorization | Supabase Docs"))
* **Upload volumineux** → basculer sur** ****signed upload URL** (2 h de validité) + chunking côté client si besoin. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl?utm_source=chatgpt.com "JavaScript: Create signed upload URL"))
* **RLS** mal écrite → revue croisée + tests d’accès systématiques ;** ****ne jamais** exposer la service key au navigateur. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* **FormData côté Next** → utiliser** ****Route Handlers** (`request.formData()`), éviter les middlewares de parsing hérités. ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))

---

## 11) Détails d’implémentation (patrons rapides)

* **Server Action** (ex. créer tâche) :
  * `"use server"` ; vérifie session, applique logique (validation) ;** **`insert ... returning *` ; revalidate chemin ou utiliser Realtime pour la synchro. ([Next.js](https://nextjs.org/docs/13/app/api-reference/functions/server-actions?utm_source=chatgpt.com "Functions: Server Actions"))
* **Route Handler upload** :
  * `export async function POST(req: Request) { const form = await req.formData(); const file = form.get('file') as File; ... }` ; enchaîner avec** **`storage.from('project-files').upload(path, file)` puis** **`insert documents`. ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))
* **URLs signées (lecture)** :** **`storage.from('project-files').createSignedUrl(path, 60*5)` → fournir à l’UI (révoquées automatiquement). ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
* **Kanban** :** **`dnd-kit` (sensors, sortable context) ; sur drop →** ****Server Action** `update tasks set status=?, position=?`. ([dndkit.com](https://dndkit.com/?utm_source=chatgpt.com "dnd kit – a modern drag and drop toolkit for React"))

---

### Prochaine étape

Si OK pour cette Phase 2, j’enchaîne avec la** ****Phase 3 – Devis/Factures + Paiements CinetPay** : schéma (quotes/invoices/payments), flux** ****checkout** (SDK ou redirection),** ****webhook sécurisé (HMAC** **`x-token`)** +** ** **`/v2/payment/check`** , statuts & reçus, et acceptation E2E.
