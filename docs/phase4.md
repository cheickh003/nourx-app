# Phase 4 — Réclamations (tickets) & Notifications

Livrables: tables `tickets`, `ticket_messages`, `ticket_attachments`, `email_events` avec RLS, policies Storage pour pièces jointes, Realtime sur `tickets` et `ticket_messages`, pages liste client `/(client)/reclamations`, page admin `/admin/reclamations`, Server Actions `src/app/actions/tickets.ts`, et route upload `POST /api/tickets/upload`.

Voir aussi la migration: `supabase/migrations/20250812130000_phase4_tickets_and_notifications.sql`.

# Phase 4 — Réclamations (tickets) & Notifications

**But** : livrer un module de** ****réclamations** complet (soumission, suivi, commentaires, pièces jointes, SLA/relances) et une** ****chaîne de notifications e-mail** fiable (création, réponse, changement de statut, rappels SLA).
**Stack** : Next.js App Router (**Route Handlers** +** ** **Server Actions** ), Supabase ( **Postgres + RLS + Realtime + Storage + Cron/pg_cron** ), service d’e-mail (Resend** ***ou* SMTP/Nodemailer). ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"),** **[Supabase](https://supabase.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime | Supabase Docs"),** **[resend.com](https://resend.com/docs/send-with-nextjs?utm_source=chatgpt.com "Send emails with Next.js"))

---

## 1) Objectifs fonctionnels

* **Client (Espace client)**
  * Créer une réclamation (catégorie, priorité, description, pièces jointes).
  * Voir la** ****file de tickets** filtrable (statut, priorité), lire un** ****ticket** (chronologie des messages, pièces jointes),** ** **répondre** .
  * Voir les** ****délais** (SLA) et les** ****états** (`open|in_progress|waiting_customer|resolved|closed`).
* **Admin (votre dash)**
  * Vue** ****globale** des réclamations (tous clients), filtres avancés, affectation interne optionnelle, modification du** ****statut** et de la** ** **priorité** .
  * **Répondre** aux tickets, ajouter des** ****notes internes** (non visibles côté client).
  * Paramétrer** ** **catégories** ,** ** **priorités** ,** ****SLA** (cibles d’intervention/résolution),** ** **modèles d’e-mails** .
  * **Rappels automatiques SLA** (pré-échéance et dépassement) via** ** **cron Supabase** . ([Supabase](https://supabase.com/docs/guides/cron?utm_source=chatgpt.com "Cron | Supabase Docs"))
* **Notifications**
  * E-mail à la** ****création** (accusé de réception), à chaque** ** **nouveau message** , à chaque** ** **changement de statut** .
  * **Rappels programmés** (SLA) et** ****escalades** (ex. label spécial si en retard).
  * Implémentation avec** ****Resend (SDK Next.js)** ou** ****SMTP/Nodemailer** (si vous préférez votre propre relais). ([resend.com](https://resend.com/docs/send-with-nextjs?utm_source=chatgpt.com "Send emails with Next.js"),** **[sendlayer.com](https://sendlayer.com/blog/how-to-send-emails-in-next-js-via-smtp-with-nodemailer/?utm_source=chatgpt.com "How to Send Emails in Next.js via SMTP with Nodemailer"))

---

## 2) Modèle de données (SQL — migrations Supabase)

> Rappel : toute table est** ** **RLS ON** ,** ****admin** accès total via rôle,** ****client** accès restreint à son périmètre via jointure** **`client_members`. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

```sql
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
  category_id uuid references public.ticket_categories(id),
  priority_id uuid references public.ticket_priorities(id),
  subject text not null,
  status text not null default 'open',     -- open|in_progress|waiting_customer|resolved|closed
  first_response_due_at timestamptz,       -- calculé depuis priority.response_sla_minutes
  resolve_due_at timestamptz,              -- calculé depuis priority.resolve_sla_minutes
  last_customer_activity timestamptz,
  last_admin_activity timestamptz,
  created_by uuid references public.profiles(user_id),  -- client ou admin
  created_at timestamptz default now()
);
alter table public.tickets enable row level security;

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

-- 4) Pièces jointes (métadonnées, fichiers dans Storage)
create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  label text,
  storage_bucket text not null default 'project-files',
  storage_path text not null,     -- ex: tickets/{ticket_id}/{uuid-filename}
  mime_type text, size_bytes bigint,
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now()
);
alter table public.ticket_attachments enable row level security;
```

### Politiques RLS (exemples à décliner)

* **Admin (vous)** :** **`FOR ALL USING (exists(select 1 from profiles p where p.user_id = auth.uid() and p.role='admin'))`.
* **Client** :** **`SELECT`/`INSERT`/`UPDATE` limité** ****aux tickets dont** **`client_id` ∈ (clients où il est membre)** via** **`client_members`.
* **Messages** :** **`visibility='internal'` **non lisible** côté client.
* **Attachments** : accès via jointure** **`ticket_id` **et** policies Storage (voir §4).
  **Raison d’être** : RLS =** ****défense en profondeur depuis Postgres** (pas seulement dans l’app). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

---

## 3) Temps réel (Realtime)

* **DB Changes** : s’abonner aux changements** ****Postgres** sur** **`tickets` et** **`ticket_messages` pour rafraîchir les listes/threads en direct (RLS respectée). ([Supabase](https://supabase.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime | Supabase Docs"))
* **Broadcast/Presence** (optionnel) :
  * **Broadcast** pour publier des événements éphémères (ex.** ** *“Admin est en train d’écrire…”* , toasts live).
  * **Presence** si besoin de suivre l’état d’utilisateurs (qui lit/écrit), à utiliser** ****avec parcimonie** car plus coûteux.
  * **Autorisation** configurable par** ****policies** (table** **`realtime.messages`) pour limiter les topics à** **`ticket:{id}:*`. ([Supabase](https://supabase.com/docs/guides/realtime/broadcast?utm_source=chatgpt.com "Broadcast | Supabase Docs"))

---

## 4) Pièces jointes (Storage) & sécurité

* Bucket** ****privé** (existant** **`project-files`) ; chemin recommandé :** **`tickets/{ticket_id}/{uuid-filename}`.
* **Lecture** : générer une** ****URL signée** courte (5–15 min) pour le téléchargement.
* **Upload** : soit upload authentifié classique, soit** ****Signed Upload URL** (utile pour gros fichiers ; validité 2 h).
* **Policies** **`storage.objects`** : autoriser** **`select/insert` **seulement** si l’utilisateur est** ****membre du client** rattaché au ticket.
  Réfs API JS :** **`createSignedUrl`,** **`createSignedUrls` (batch),** **`createSignedUploadUrl`. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))

---

## 5) Notifications e-mail

* **Choix A (recommandé)** :** ****Resend** (SDK officiel pour Next.js, template React). Simple, fiable, bon DX. ([resend.com](https://resend.com/docs/send-with-nextjs?utm_source=chatgpt.com "Send emails with Next.js"))
* **Choix B** :** ****SMTP/Nodemailer** (Route Handler Next.js) si vous avez déjà un relais SMTP (Gmail/Provider), attention au** ****spam** en free tier. ([sendlayer.com](https://sendlayer.com/blog/how-to-send-emails-in-next-js-via-smtp-with-nodemailer/?utm_source=chatgpt.com "How to Send Emails in Next.js via SMTP with Nodemailer"))

**Événements qui déclenchent un e-mail :**

1. **ticket.created** (accusé de réception client + alerte admin)
2. **ticket.message.created** (nouveau message public)
3. **ticket.status.changed** (ex.** **`resolved` → modèle “résolution”)
4. **SLA.reminder** (via** ****Cron** — pré-échéance et dépassement) ([Supabase](https://supabase.com/docs/guides/cron?utm_source=chatgpt.com "Cron | Supabase Docs"))

**Implémentation technique :**

* Déclencheur côté** ****app** (Server Action)** ***ou* **DB Trigger** +** ****Supabase Cron/pg_cron → Edge Function** pour planifier/relancer proprement.
* **Edge Function planifiée** (toutes les 5–10 min) :
  * Recherche des tickets** ****bientôt en pré-échéance** (`now() > first_response_due_at - interval '15 min'`) et** ****en dépassement** ; envoie les e-mails correspondants ; journalise l’envoi (table** **`email_events`).
  * Programmation via** ****Supabase Cron** (interface Dashboard ou SQL** **`cron.schedule(...)`), ex. */5. ([Supabase](https://supabase.com/docs/guides/cron?utm_source=chatgpt.com "Cron | Supabase Docs"))

---

## 6) API interne & Server Actions (patrons)

* **Server Actions** (mutations formulaires) :** **`createTicket`,** **`replyTicket`,** **`changeStatus`,** **`uploadAttachmentMeta`, etc. Elles vivent** ****côté serveur** (directive** **`"use server"`). ([Next.js](https://nextjs.org/docs/13/app/api-reference/functions/server-actions?utm_source=chatgpt.com "Functions: Server Actions"))
* **Route Handlers** (HTTP) :
  * `POST /api/tickets/upload` : réception** **`FormData`, upload vers Storage (ou génération** ** **Signed Upload URL** ), création de la ligne** **`ticket_attachments`.
  * `POST /api/notifications/test` : endpoint interne pour tester un envoi e-mail.
  * (Optionnel)** **`GET /api/tickets/:id/feed` pour pagination serveur.
    *Les Route Handlers exploitent l’API Web (`Request/Response`) et supportent POST/PUT/DELETE, etc.* ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))

---

## 7) UX / UI (shadcn/ui + Tailwind)

* **Liste des tickets** (client & admin) : Table (tri, filtres), états via** ** **Badges** .
* **Fiche ticket** : en-tête (SLA, statut, priorité, projet),** ****timeline** des messages avec libellés “public”/“interne”, zone de** ****réponse** riche (upload drag-drop).
* **SLA** : compte à rebours (pré-échéance, retard), pastilles d’alerte.
* **Accessibilité** : focus visible, annonce ARIA sur changements d’état.

---

## 8) Étapes opératoires (checklist)

1. **Migrations** : créer** **`ticket_categories`,** **`ticket_priorities`,** **`tickets`,** **`ticket_messages`,** **`ticket_attachments` ; activer** ****RLS** & policies. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
2. **Storage** : définir chemins** **`tickets/{ticket_id}/…` ; écrire** ****policies** `storage.objects` (liaison** **`ticket_attachments`). Générer des** ****URLs signées** pour lecture. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
3. **Server Actions & Routes** :
   * `createTicket`,** **`replyTicket`,** **`changeStatus` ;
   * `POST /api/tickets/upload` (FormData → Storage) ;
   * hooks d’envoi e-mail (après insert). ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))
4. **Realtime** : souscriptions** ****Postgres Changes** sur** **`tickets` et** **`ticket_messages` ; (optionnel)** ****Broadcast** pour “typing…”. ([Supabase](https://supabase.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime | Supabase Docs"))
5. **Notifications** : intégrer** ****Resend** (clé API, domaine vérifié)** ****ou** SMTP/Nodemailer ; templates (création, réponse, statut, SLA). ([resend.com](https://resend.com/docs/send-with-nextjs?utm_source=chatgpt.com "Send emails with Next.js"))
6. **Cron SLA** : activer** ****Supabase Cron** (ou** **`pg_cron`) pour exécuter une** ****Edge Function** toutes les 5–10 min qui détecte les tickets à rappeler/écaler et envoie les e-mails. ([Supabase](https://supabase.com/docs/guides/functions/schedule-functions?utm_source=chatgpt.com "Scheduling Edge Functions | Supabase Docs"))
7. **UI** : pages client** **`/reclamations` + admin** **`/admin/reclamations` (liste + détail).
8. **Logs & audit** : table** **`email_events` (ticket_id, type, to, status, provider_id, payload_excerpt, created_at).

---

## 9) Critères d’acceptation (mesurables)

* **Création & fil** : un client crée un ticket avec pièce jointe,** ****voit** la fiche ; admin** ****voit** le même ticket,** ****répond** ; le client** ****reçoit** l’e-mail,** ****voit** le message en temps réel. ([Supabase](https://supabase.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime | Supabase Docs"))
* **Sécurité (RLS)** : un client** ****ne voit pas** le ticket d’un autre client ; messages** ****internes** invisibles côté client. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* **Pièces jointes** : upload OK ;** ****téléchargement via URL signée** (expire) ; accès interdit aux non-membres. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
* **SLA & Cron** : une** ****Edge Function planifiée** envoie les** ****rappels** (pré-échéance/retard) ; journal** **`email_events`mis à jour. ([Supabase](https://supabase.com/docs/guides/functions/schedule-functions?utm_source=chatgpt.com "Scheduling Edge Functions | Supabase Docs"))

---

## 10) Détails d’implémentation (extraits)

### A) Server Action — création ticket

* Vérifie la session (SSR),** ****insère** `tickets` + calcule** **`first_response_due_at` et** **`resolve_due_at` à partir de la priorité.
* **Envoie** l’e-mail d’accusé de réception (Resend ou Nodemailer).
* **Revalidate** la liste (ou rely Realtime).

### B) Route Handler — upload pièce jointe

```ts
// app/api/tickets/upload/route.ts
export async function POST(req: Request) {
  const form = await req.formData();             // API Web dans Route Handlers
  const file = form.get("file") as File;
  const ticketId = form.get("ticket_id") as string;
  // …contrôles, chemin Storage → upload ou Signed Upload URL puis insert ticket_attachments
  return new Response(JSON.stringify({ ok:true }), { status: 200 });
}
```

*(Les Route Handlers gèrent GET/POST/PUT… et utilisent l’API Request/Response.)* ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))

### C) Notifications — Resend (exemple)

* Installer, créer un template React Email, envoyer via** ****SDK** côté serveur (Route Handler/Action). ([resend.com](https://resend.com/docs/send-with-nextjs?utm_source=chatgpt.com "Send emails with Next.js"))

### D) Cron SLA — Supabase

* **Edge Function** “`sla-monitor`” :
  * cherche tickets en** ** **pré-échéance** /retard, envoie mails avec contexte, marque** **`email_events`.
* **Programmation** :** ****Supabase Cron** (Dashboard ou SQL** **`cron.schedule`) toutes les 5–10 min. ([Supabase](https://supabase.com/docs/guides/cron?utm_source=chatgpt.com "Cron | Supabase Docs"))

---

## 11) Tests & QA

* **Unitaires SQL (RLS)** : SELECT cross-client** ****refusé** ;** **`visibility='internal'` **non visible** côté client. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* **Intégration** :
  * `createTicket` crée ticket + calcule** **`*_due_at`.
  * Upload →** **`ticket_attachments` + accès** ****URL signée** fonctionne. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
  * Realtime : nouveau message** ****poussé** sans reload. ([Supabase](https://supabase.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime | Supabase Docs"))
  * E-mail : Resend/SMTP en sandbox → reçu ;** ****Edge Function Cron** envoie rappel. ([resend.com](https://resend.com/docs/send-with-nextjs?utm_source=chatgpt.com "Send emails with Next.js"),** **[Supabase](https://supabase.com/docs/guides/cron?utm_source=chatgpt.com "Cron | Supabase Docs"))
* **E2E (Playwright)** : parcours client→admin→client avec délais (simulation de SLA proche).

---

## 12) Risques & parades

* **RLS mal réglée** → revue systématique des policies (admin bypass / client par appartenance). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* **Pièces jointes** exposées** → toujours** ****buckets privés** +** ** **URLs signées** /JWT ; jamais d’URL publique par défaut. ([Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl?utm_source=chatgpt.com "JavaScript: Create a signed URL"))
* **Charge Realtime** → privilégier** ****DB Changes** pour listes,** ****Broadcast** seulement pour signaux éphémères ;** ****Presence** si besoin réel. ([Supabase](https://supabase.com/docs/guides/realtime?utm_source=chatgpt.com "Realtime | Supabase Docs"))
* **Fiabilité e-mail** → Resend (DKIM/domain verify) ; sinon SMTP avec IP/DMARC corrects (attention aux spams). ([resend.com](https://resend.com/docs/send-with-nextjs?utm_source=chatgpt.com "Send emails with Next.js"),** **[sendlayer.com](https://sendlayer.com/blog/how-to-send-emails-in-next-js-via-smtp-with-nodemailer/?utm_source=chatgpt.com "How to Send Emails in Next.js via SMTP with Nodemailer"))
* **Planification** → utiliser** ****Supabase Cron** (pg_cron) + Edge Functions ; journaliser pour audit. ([Supabase](https://supabase.com/docs/guides/cron?utm_source=chatgpt.com "Cron | Supabase Docs"))

---

### Prochaine étape

On passe à la** ****Phase 5 – Durcissement sécurité, Observabilité (Sentry/PostHog), QA & Go-Live** : durcir CSP/headers, anti-abuse (rate-limit), traces d’erreurs, analytics produit, tests de charge, et check-list de mise en prod. Souhaites-tu que j’enchaîne ?
