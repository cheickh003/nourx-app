# Plan d’implémentation — Espace Client NOURX

**Stack :** Next.js (App Router) + Tailwind CSS + shadcn/ui + Supabase (Auth, Postgres, Storage, RLS, Realtime) + CinetPay (paiements).
**Objectif de la Phase 1 :** poser** ****toutes les fondations techniques** (projet Next.js, design system N/B, Auth SSR, schéma Postgres + RLS, Storage privé, squelette des pages Client/Admin) pour commencer à brancher les features fonctionnelles ensuite.

---

## Découpage global (aperçu des phases)

1. **Phase 1 – Fondations & Auth & Données** (celle-ci en détail ci-dessous)
2. **Phase 2 – Projets, Roadmap, Tâches, Documents** (CRUD + Realtime + upload sécurisé)
3. **Phase 3 – Devis/Factures + Paiements CinetPay** (checkout, webhook HMAC** **`x-token`,** **`/v2/payment/check`) ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/hmac?utm_source=chatgpt.com "CinetPay X-TOKEN HMAC"))
4. **Phase 4 – Réclamations & Notifications** (tickets, SLA, e-mail)
5. **Phase 5 – Dureté sécurité, Sentry/PostHog, QA & Go-Live**

---

# Phase 1 — Fondations & Auth & Données (détaillée)

### A. Création du projet & outillage

1. **Créer l’app Next.js (TypeScript, App Router)**

```bash
npx create-next-app@latest nourx-portal \
  --typescript --eslint --app --src-dir --import-alias "@/*"
cd nourx-portal
```

*Réf.* création & App Router. ([Next.js](https://nextjs.org/docs/app/getting-started/installation?utm_source=chatgpt.com "Getting Started: Installation"))

2. **Installer Tailwind (App Router)**

```bash
# si non proposé automatiquement
pnpm add -D tailwindcss @tailwindcss/postcss
# PostCSS config (Next.js guide)
# postcss.config.mjs
export default { plugins: { '@tailwindcss/postcss': {} } }
# app/globals.css
@import 'tailwindcss';
```

*Guides officiels Next.js & Tailwind.* ([Next.js](https://nextjs.org/docs/app/guides/tailwind-css?utm_source=chatgpt.com "Guides: Tailwind CSS"),** **[tailwindcss.com](https://tailwindcss.com/docs/guides/nextjs?utm_source=chatgpt.com "Install Tailwind CSS with Next.js"))

3. **Palette & design system (90% N/B + accent)**

* `tailwind.config.ts` : définir tokens** **`--background` (blanc),** **`--foreground` (noir), un** ****accent unique** (ex. bleu NOURX) pour badges/CTA.
* Prévoir** ****dark mode** optionnel (classe** **`dark`).
* Installer** ****shadcn/ui** et générer localement les composants nécessaires (Button, Card, Input, Table, Dialog, Badge, Tabs, Breadcrumb, Sheet, DropdownMenu).

```bash
# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input table dialog badge tabs breadcrumb sheet dropdown-menu
```

*shadcn/ui s’intègre nativement à Next.js et se copie dans votre code pour un contrôle total.* ([Shadcn UI](https://ui.shadcn.com/docs/installation?utm_source=chatgpt.com "Installation - Shadcn UI"),** **[Shadcn](https://v3.shadcn.com/docs/installation?utm_source=chatgpt.com "Installation - shadcn/ui"))

4. **Structure des routes (squelettes) – Client & Admin**

```
app/
  (client)/
    dashboard/page.tsx
    projet/page.tsx
    feuille-de-route/page.tsx
    taches/page.tsx
    factures-devis/page.tsx
    documents/page.tsx
    reclamations/page.tsx
    parametres/page.tsx
  (admin)/
    admin/projets/page.tsx
    admin/clients/page.tsx
    admin/prospects/page.tsx
    admin/taches/page.tsx
    admin/reclamations/page.tsx
    admin/factures-devis/page.tsx
    admin/parametres/page.tsx
  api/
    webhooks/
      cinetpay/route.ts   # (Phase 3)
```

*Les** ****Route Handlers** (`route.ts`) sont l’API interne côté App Router.* ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))

---

### B. Supabase — projet, Auth SSR, clients utilitaires

1. **Créer/configurer le projet Supabase**

* Si local : installer** ****Supabase CLI** + Docker, puis** **`supabase init` &** **`supabase start`.
* Sinon : créer un projet hébergé (Dashboard), récupérer URL/keys.
  *CLI & local dev (migrations, seed, Realtime, Storage).* ([Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started?utm_source=chatgpt.com "Supabase CLI"))

2. **Installez SDK & helpers SSR**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

* Créer** ****deux clients** :** ****client component** &** ****server component** (SSR/Server Actions/Route Handlers) +** ****middleware** pour gérer la session par** ****cookies** (recommandé). ([Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))

3. **Variables d’environnement (Next.js)**
   `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # côté serveur uniquement
```

*Auth SSR + cookies avec** **`@supabase/ssr`.* ([Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))

4. **Boilerplate Auth SSR**

* `lib/supabase/server.ts` &** **`lib/supabase/client.ts` selon le guide** ** **“Server-Side Auth for Next.js”** .
* `middleware.ts` pour rafraîchir la session et protéger les routes authentifiées. ([Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))

---

### C. Modèle de données (SQL) & RLS

**Objectif :** toutes les entités minimales +** ****RLS stricte** pour que chaque client ne voie** ****que** ses données, et que** ** **l’admin** (vous) voie tout.

1. **Tables cœur (extrait MVP Phase 1)**

* `profiles` (`user_id` =** **`auth.uid()`,** **`role` enum:** **`admin|client`,** **`full_name`,** **`phone`)
* `clients` (entreprise/particulier : raison_sociale, contact)
* `client_members` (liaison** **`user_id` ↔** **`client_id`,** **`is_primary`)
* `projects` (`client_id`,** **`title`,** **`status`,** **`progress`)
* **(Phase 2)** :** **`milestones`,** **`tasks`,** **`task_comments`,** **`documents`
* **(Phase 3)** :** **`quotes`,** **`invoices`,** **`invoice_items`,** **`payments`,** **`payment_attempts`
* Transverse :** **`audit_logs`

2. **Migrations avec Supabase CLI**

```bash
npx supabase migration new init_core_schema
# Éditer supabase/migrations/*_init_core_schema.sql puis :
npx supabase migration up
```

*Guides officiels migrations (new / up / diff).* ([Supabase](https://supabase.com/docs/guides/deployment/database-migrations?utm_source=chatgpt.com "Database Migrations | Supabase Docs"))

3. **Exemple SQL – schéma & RLS (Phase 1)**

> **NB** : Activer** ****RLS** sur toutes les tables et écrire des** ****policies** basées sur** **`auth.uid()` + appartenance via** **`client_members`.
> *RLS est un** ****primitive Postgres** ; Supabase l’active au niveau table avec des policies attachées.* ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"),** **[docs-88ovtbp5i-supabase.vercel.app](https://docs-88ovtbp5i-supabase.vercel.app/docs/guides/auth/row-level-security?utm_source=chatgpt.com "Row Level Security - Supabase Docs - Vercel"))

```sql
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

-- POLICIES

-- Helper: vue admin (bypass) et vue client (par appartenance)
-- Clients visibles par:
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

-- client_members (un utilisateur lit ses liaisons ; admin full)
create policy "admin can all on client_members"
  on public.client_members for all
  using ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') )
  with check ( exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin') );

create policy "user can read own memberships"
  on public.client_members for select
  using ( client_members.user_id = auth.uid() );

-- Projects: admin tout ; client si membre du client_id
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

-- Activer Realtime optionnel (hérite des mêmes RLS)
-- alter publication supabase_realtime add table public.projects;
```

* **Principes clés RLS** (défense en profondeur ; policies =** ***WHERE* implicite). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"),** **[docs-88ovtbp5i-supabase.vercel.app](https://docs-88ovtbp5i-supabase.vercel.app/docs/guides/auth/row-level-security?utm_source=chatgpt.com "Row Level Security - Supabase Docs - Vercel"))
* **Realtime** respecte aussi les policies. ([Supabase](https://supabase.com/docs?utm_source=chatgpt.com "Supabase Docs"))

---

### D. Storage Supabase (documents privés)

1. **Bucket privé**

* Créer** **`project-files` **private** (Dashboard ou SQL).
* Convention de chemin :** **`project-{project_id}/{uuid-filename}`.

2. **Accès**

* **Lecture** : deux options officielles
  a)** ****URL signée** (durée limitée) ; ou
  b)** ****download avec JWT** (headers) si policy** **`select` ok. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))

3. **Policies Storage (exemple)**

> Autoriser** **`select/insert` si l’utilisateur est** ****membre** du client propriétaire du projet du document.

* Pratique courante : stocker un enregistrement dans** **`documents(project_id, path, label, ...)`, et écrire la policy** **`storage.objects` en se basant sur l’existence de ce lien.
* **Partage externe** : générer des** ****signed URLs** (expiration). ([Supabase](https://supabase.com/docs/guides/storage?utm_source=chatgpt.com "Storage | Supabase Docs"))

---

### E. Auth UI & Guarding des routes

1. **Pages publiques** :** **`/auth/sign-in`,** **`/auth/callback` (si OAuth plus tard).
2. **Protection** : middleware Next.js + clients** **`@supabase/ssr` (cookies) pour** ****SSR** sécurisé, pas de** **`localStorage`. ([Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))
3. **Redirections** :

* utilisateur** ****client** →** **`/dashboard`
* **admin** →** **`/admin/projets`

*Réf. Next.js Auth (concepts) & Supabase SSR.* ([Next.js](https://nextjs.org/docs/app/guides/authentication?utm_source=chatgpt.com "Guides: Authentication"),** **[Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))

---

### F. Squelettes UI (shadcn/ui + Tailwind)

* **Layout global** : barre latérale (sections : Dashboard, Aperçu projet, Feuille de route, Tâches, Factures & Devis, Documents, Réclamations, Paramètres).
* **Admin** : nav séparée** **`/admin/*` (Projets, Clients, Prospects, Tâches, Réclamations, Factures & Devis, Paramètres).
* **Composants de base** :** ****Card** pour KPIs,** ****Table** pour listes,** ****Dialog** pour create/edit,** ****Tabs** sur fiche Projet,** ****Badge**pour statuts,** ****Breadcrumb** pour navigation.
* **Thème** : blanc/noir, un** ****accent** discret pour CTA/états.
  *shadcn/ui docs.* ([Shadcn UI](https://ui.shadcn.com/docs/installation?utm_source=chatgpt.com "Installation - Shadcn UI"))

---

### G. Acceptation Phase 1 (critères mesurables)

* ✅** ****Build** : le projet Next.js compile et se lance (`pnpm dev`). ([Next.js](https://nextjs.org/docs/app/getting-started/installation?utm_source=chatgpt.com "Getting Started: Installation"))
* ✅** ****Auth SSR** : connexion/déconnexion fonctionnelles, session persistée en** ****cookies** ;** **`profiles` créé à l’inscription. ([Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))
* ✅** ****RLS** : un** ****client A** ne peut ni lire ni modifier des données du** ****client B** ; l’**admin** voit tout. (Tests : SELECT cross-client →** ** **denied** .) ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* ✅** ****Storage** : upload d’un fichier dans** **`project-files` et** ****lecture via URL signée** ; aucune lecture anonyme. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
* ✅** ****Squelettes pages** : toutes les routes** ****Client** et** ****Admin** existent, avec placeholders et navigation.

---

### H. Étapes opératoires (checklist détaillée)

1. **Repo & CI minimal**

* Init Git, règles** **`.env*` dans** **`.gitignore`.
* Scripts :** **`dev`,** **`build`,** **`lint`,** **`typecheck`.

2. **Next.js + Tailwind + shadcn/ui** (A-1 → A-3)

* Vérifier que les classes Tailwind s’appliquent (problème courant : import global & config PostCSS). ([Next.js](https://nextjs.org/docs/app/guides/tailwind-css?utm_source=chatgpt.com "Guides: Tailwind CSS"),** **[Stack Overflow](https://stackoverflow.com/questions/79596185/tailwind-css-classes-not-applying-in-next-js-14-app-router-project?utm_source=chatgpt.com "Tailwind CSS classes not applying in Next.js 14 App ..."))

3. **Supabase**

* Créer projet (Cloud** ****ou** local via CLI). ([Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started?utm_source=chatgpt.com "Supabase CLI"))
* Récupérer** **`URL`,** **`anon`,** **`service_role` et renseigner** **`.env.local`.
* Ajouter tables/procs : créer migration** **`init_core_schema` (C-2) puis** **`supabase migration up`. ([Supabase](https://supabase.com/docs/guides/deployment/database-migrations?utm_source=chatgpt.com "Database Migrations | Supabase Docs"))
* Activer** ****RLS** + policies (C-3). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* Créer un** ****user admin** (`profiles.role='admin'`) + un** ****user client** lié via** **`client_members`.

4. **Auth SSR** (B-2 → B-4)

* Implémenter** **`lib/supabase/server.ts`,** **`lib/supabase/client.ts`.
* `middleware.ts` : rafraîchir la session, interdire** **`/app/(client)/**` et** **`/app/(admin)/**` aux non authentifiés. ([Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))

5. **Storage** (D)

* Créer** **`project-files` (private).
* Écrire policies** **`storage.objects` basées sur** **`documents` (à poser vide pour Phase 1 ou créer la table maintenant).
* Tester** ****signed URLs** en lecture. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))

6. **Squelettes UI & Navigation** (F)

* Mettre en place layouts, sidebars, breadcrumbs et pages vides.
* Préparer tables UI (shadcn Table) pour listes futures.

---

### I. Risques & parades (Phase 1)

* **RLS mal configurée** ⇒ tests SQL & revue (principes et exemples officiels). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"),** **[docs-88ovtbp5i-supabase.vercel.app](https://docs-88ovtbp5i-supabase.vercel.app/docs/guides/auth/row-level-security?utm_source=chatgpt.com "Row Level Security - Supabase Docs - Vercel"))
* **Tailwind non chargé** (App Router) ⇒ vérifier import** **`@import 'tailwindcss';` et PostCSS plugin. ([Next.js](https://nextjs.org/docs/app/guides/tailwind-css?utm_source=chatgpt.com "Guides: Tailwind CSS"))
* **Confusion Storage privé** ⇒ utiliser** ****URL signées** ou** ****JWT** (deux modes supportés). ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
* **Sessions côté SSR** ⇒ suivre** ****@supabase/ssr** (cookies). ([Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))

---

### J. Livrables Phase 1

* **Repo Git** avec :
  * Next.js + Tailwind + shadcn/ui configurés, palette N/B.
  * **Clients Supabase** SSR/Client +** ** **middleware** . ([Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs?utm_source=chatgpt.com "Setting up Server-Side Auth for Next.js"))
  * **Migrations SQL** :** **`profiles`,** **`clients`,** **`client_members`,** **`projects` +** ** **RLS** . ([Supabase](https://supabase.com/docs/guides/deployment/database-migrations?utm_source=chatgpt.com "Database Migrations | Supabase Docs"))
  * **Bucket privé** `project-files` + test** ** **signed URL** . ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
  * **Squelettes** de toutes les pages Client & Admin.

---

## Notes d’implémentation utiles pour les phases suivantes

* **Webhooks/Paiements CinetPay (Phase 3)**
  * `app/api/webhooks/cinetpay/route.ts` :** ****lire le corps brut** (`await request.text()`), vérifier le** ****header HMAC** **`x-token`** puis** ****re-vérifier** l’état via** **`POST https://api-checkout.cinetpay.com/v2/payment/check` avant de marquer la facture payée. (Pattern similaire à Stripe : importance du corps brut pour la signature.) ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/hmac?utm_source=chatgpt.com "CinetPay X-TOKEN HMAC"),** **[docs.stripe.com](https://docs.stripe.com/webhooks?utm_source=chatgpt.com "Receive Stripe events in your webhook endpoint"))
  * Intégration** ****redirection** ou** ****SDK Seamless JS** selon device. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation?utm_source=chatgpt.com "Initiating a payment | CinetPay-Documentation"))
* **Route Handlers** : API interne recommandée sous App Router (pas d’API Routes nécessaires). ([Next.js](https://nextjs.org/docs/app/getting-started/route-handlers-and-middleware?utm_source=chatgpt.com "Getting Started: Route Handlers and Middleware"))

---

## Prochaine étape

Si vous validez cette** ** **Phase 1** , j’enchaîne avec la** ****Phase 2** (Projets, Roadmap, Tâches, Documents) : schémas complets, policies supplémentaires, composants UI (Kanban/Liste), upload Storage avec règles, et Realtime (listes & commentaires).
