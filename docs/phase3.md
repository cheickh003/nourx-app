# Phase 3 — Devis/Factures + Paiements CinetPay

**But** : permettre au client de** ** **lire/valider un devis** , de** ****payer ses factures en ligne** (Mobile Money, carte, etc.), et d’assurer une** ****concordance fiable** des statuts via** ****webhook sécurisé (HMAC** **`x-token`)** +** ** **vérification serveur** . Périmètre :** ****Next.js App Router** (Server Actions + Route Handlers) +** ****Supabase** (Postgres + RLS) +** ****CinetPay** (init, retour, notification, vérification).

---

## 1) Flux fonctionnels cibles

1. **Devis → Facture**

* Admin crée un** ****devis** (PDF généré, statut** **`draft` →** **`sent`).
* Client consulte,** ****accepte** (passe** **`accepted`) →** ****génère facture** (`issued`).npm
* (Option) Refus/commentaires de devis.

2. **Paiement de facture**

* Client ouvre facture →** ****Payer** →
  a)** ****Redirection** vers l’URL de paiement (recommandé iOS), ou
  b)** ****SDK Seamless** en page (popin) sur desktop/Android.
* À la fin :** ****CinetPay appelle le webhook** (plusieurs fois possible)** ****avec** **`x-token`** ;** ****NOUS vérifions l’HMAC** puis** ****appelons** **`/v2/payment/check`** pour l’état final → on met à jour la facture et on émet un** ** **reçu** . ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))

3. **Post-paiement**

* Affichage reçu + export PDF ; journal des tentatives (auditable).
* État facture :** **`paid` (ou** **`failed`/`pending`), tentative horodatée, payload conservé.

**Notes CinetPay critiques**

* **Initialisation** :** **`POST https://api-checkout.cinetpay.com/v2/payment` (JSON), champs requis,** ****montant multiple de 5** (sauf USD),** **`return_url` &** **`notify_url`. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))
* **Notification** : en-tête** ****`x-token`** (HMAC) +** ****form fields** (`cpm_site_id`,** **`cpm_trans_id`, …).** ****Toujours** re-checker via** ****`/v2/payment/check`** (statut vrai), car la notif peut arriver plusieurs fois et certains opérateurs utilisent des** ****push différés** ( *WAITING_FOR_CUSTOMER* ). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/notification "Prepare a notification page | CinetPay-Documentation"))
* **HMAC** : concaténation stricte des champs documentés →** ****HMAC-SHA256** avec** ****Secret Key** ; comparer à** **`x-token`. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/hmac "CinetPay X-TOKEN HMAC | CinetPay-Documentation"))
* **Vérification** :** **`POST https://api-checkout.cinetpay.com/v2/payment/check` (apikey, site_id, transaction_id). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/verification "Checking a transaction | CinetPay-Documentation"))
* **iOS** : Safari bloque des cookies en pop-up →** ****préférer la redirection** (fallback automatique). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))

---

## 2) Schéma de données (Supabase / Postgres) — migrations

> On complète la Phase 1–2 avec les entités Finance & Paiement.

```sql
-- 1) Devis
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  number text not null unique,                 -- ex: Q-2025-0001
  currency text not null default 'XOF',
  total_ht numeric(14,2) not null default 0,
  total_tva numeric(14,2) not null default 0,
  total_ttc numeric(14,2) not null default 0,
  status text not null default 'draft',        -- draft|sent|accepted|rejected|expired|canceled
  pdf_url text,                                -- Storage (signed)
  expires_at date,
  created_at timestamptz default now()
);
alter table public.quotes enable row level security;

create table if not exists public.quote_items (
  id bigint primary key generated always as identity,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  label text not null,
  qty numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 0
);

-- 2) Factures
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  number text not null unique,                 -- ex: F-2025-0001
  currency text not null default 'XOF',
  total_ht numeric(14,2) not null default 0,
  total_tva numeric(14,2) not null default 0,
  total_ttc numeric(14,2) not null default 0,
  due_date date,
  status text not null default 'issued',       -- draft|issued|sent|paid|overdue|canceled
  pdf_url text,
  external_ref text,                           -- ref CinetPay token/id si utile
  created_at timestamptz default now()
);
alter table public.invoices enable row level security;

create table if not exists public.invoice_items (
  id bigint primary key generated always as identity,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  label text not null,
  qty numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 0
);

-- 3) Paiements & tentatives
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(14,2) not null,
  currency text not null default 'XOF',
  status text not null,                        -- pending|accepted|refused|canceled
  method text,                                 -- OM|MTN|CARD|...
  cinetpay_transaction_id text,                -- cpm_trans_id (init)
  operator_id text,                            -- renvoyé par /check
  paid_at timestamptz,
  raw_payload_json jsonb,                      -- réponse /check
  created_at timestamptz default now()
);
alter table public.payments enable row level security;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  cinetpay_payment_token text,                 -- payment_token retourné à l'init
  cinetpay_payment_url text,                   -- payment_url (si redirection)
  transaction_id text not null,                -- transaction_id de l'init
  status text not null default 'created',      -- created|redirected|webhooked|checked|completed|failed
  channel text,                                -- ALL|MOBILE_MONEY|CREDIT_CARD|WALLET
  amount numeric(14,2) not null,
  currency text not null default 'XOF',
  notify_count int not null default 0,
  created_at timestamptz default now()
);
alter table public.payment_attempts enable row level security;
```

### RLS (patterns)

* **Admin** : accès total (`profiles.role='admin'`).
* **Client** : accès** ****uniquement** aux lignes rattachées à ses** **`client_id` via jointure (`client_members`).
* **Lecture** `payments` et** **`payment_attempts` filtrée par** **`invoice_id → client_id`.

> RLS apporte une** ****défense en profondeur** ; policies** **`SELECT/INSERT/UPDATE/DELETE` adaptées par rôle. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

---

## 3) Intégration CinetPay (Next.js App Router)

### 3.1 Initialisation (Server Action / Route Handler)

* Endpoint interne :** **`POST /api/invoices/:id/pay`
  * Récupère la facture,** ****vérifie** devise &** ****montant** (arrondi multiple de 5 si XOF/XAF/… ;** ** **USD exempt** ).
  * Crée une ligne** **`payment_attempts` (status** **`created`).
  * **Appelle** `POST https://api-checkout.cinetpay.com/v2/payment` (JSON) avec :** **`apikey`,** **`site_id`,** **`transaction_id` (unique),** **`amount`,** **`currency`,** **`description`,** **`notify_url`,** **`return_url`,** **`channels`, informations client (si carte).
  * **Stocke** `payment_token` /** **`payment_url`, met** **`payment_attempts.status='redirected'`, renvoie au front le** ****lien** (ou lance** ** **Seamless SDK** ). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))

> **Remarques** :
>
> * **Seamless JS SDK** (script** **`https://cdn.cinetpay.com/seamless/main.js`) pour embarquer le guichet** ****sans quitter** la page ;** ** **préférer la redirection sur iOS** . ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/sdk/js?utm_source=chatgpt.com "CinetPay SDK-SEAMLESS integration"))
> * `channels` :** **`ALL|MOBILE_MONEY|CREDIT_CARD|WALLET`. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))

### 3.2 Webhook (Notification CinetPay)

* Route handler :** **`POST /api/webhooks/cinetpay`
  * **Lire** **`formData()`** (CinetPay envoie des** ** **form fields** ).
  * Reconstituer la** ****chaîne d’HMAC** dans** ****l’ordre exact** :
    `cpm_site_id + cpm_trans_id + cpm_trans_date + cpm_amount + cpm_currency + signature + payment_method + cel_phone_num + cpm_phone_prefixe + cpm_language + cpm_version + cpm_payment_config + cpm_page_action + cpm_custom + cpm_designation + cpm_error_message`
  * Calculer** **`HMAC-SHA256` avec la** ****Secret Key** → comparer au header** ** **`x-token`** .
  * **Toujours** ensuite appeler** ****`/v2/payment/check`** (apikey, site_id, transaction_id) pour** ** **statut final** (`ACCEPTED`/`REFUSED`…).
  * Incrémenter** **`notify_count`, journaliser le payload,** ****idempotence** : si paiement déjà** **`ACCEPTED`, ne rien refaire. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/hmac "CinetPay X-TOKEN HMAC | CinetPay-Documentation"))

> **Pourquoi** **`formData()` ?** Les notifications CinetPay arrivent avec des** ****champs de formulaire** ; les Route Handlers de Next.js exposent l’API Web (`Request`), donc on lit** **`await request.formData()` (ou** **`await request.text()` si besoin du brut pour d’autres passerelles). ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))

### 3.3 Retour de l’utilisateur (return_url)

* Route :** **`GET/POST /api/payments/return`
  * Affiche un** ****état provisoire** + relance** ****/check** côté serveur si besoin (l’utilisateur peut revenir avant le webhook).
  * Redirige vers la page facture avec statut à jour. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/retour?utm_source=chatgpt.com "Prepare a return url"))

---

## 4) UI/UX (client & admin)

* **Client / Factures & Devis**
  * Liste + filtres (statuts),** ****fiche** (lignes, TVA, échéance),** ****PDF** (devis/facture), bouton** ** **Payer** .
  * **Seamless** (popin) ou** ****redirection** ; toasts d’état ; reçu téléchargeable.
* **Admin**
  * Édition** ****devis** (lignes, TVA, conditions),** ** **génération facture** .
  * Tableau** ****paiements** (tentatives, statuts,** **`operator_id`, journaux).
  * Actions : renvoyer un** ** **lien de paiement** ,** ****annuler** une facture,** ****restituer** (hors MVP).

**Design** : N/B (90%) + accent NOURX (badges d’état :** **`paid`,** **`overdue`,** **`accepted`,** **`refused`).
**Accessibilité** : focus visible, messages d’erreur clairs (montant non multiple de 5). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))

---

## 5) Étapes opératoires (checklist)

1. **Migrations** : créer** **`quotes`,** **`quote_items`,** **`invoices`,** **`invoice_items`,** **`payments`,** **`payment_attempts` + RLS (admin/full, client par jointure). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
2. **Route Handlers**
   * `POST /api/invoices/:id/pay` → initialise paiement (CinetPay). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))
   * `POST /api/webhooks/cinetpay` → vérifie** ** **HMAC** **`x-token`** , puis** ** **/payment/check** . ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/hmac "CinetPay X-TOKEN HMAC | CinetPay-Documentation"))
   * `GET/POST /api/payments/return` → statut provisoire + redirect. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/retour?utm_source=chatgpt.com "Prepare a return url"))
3. **Server Actions** : CRUD devis/factures, génération PDF, envoi d’email (lien de paiement).
4. **Front** : pages** **`factures-devis` (client) &** **`admin/factures-devis`. Bouton** ****Payer** (Seamless/redirect).
5. **Journal & idempotence** : stocker payloads notif /check,** ****verrouiller** double-traitement.
6. **Validation devise & montant** : bloquer init si devise ≠ autorisée par compte ou montant non multiple de 5 (sauf USD). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))
7. **Tests** (voir §7).
8. **Secrets** :** **`CINETPAY_APIKEY`,** **`CINETPAY_SITE_ID`,** **`CINETPAY_SECRET_KEY`,** **`CINETPAY_NOTIFY_URL`,** **`CINETPAY_RETURN_URL` en variables serveur.

---

## 6) Politiques RLS (exemples)

```sql
-- ADMIN: all on invoices
create policy "admin all on invoices"
on public.invoices for all
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role='admin'));

-- CLIENT: read own invoices via client_members
create policy "member select invoices"
on public.invoices for select
using (exists (
  select 1 from public.client_members cm
  where cm.client_id = invoices.client_id and cm.user_id = auth.uid()
));

-- Idem pour quotes, payments, payment_attempts...
```

> **Rappel** : RLS s’applique aussi aux flux** ****Realtime** si activés ; n’exposez** ****jamais** la Service Key côté navigateur. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

---

## 7) Tests & QA

**Unitaires SQL**

* Policies RLS (accès cross-client →** ** **refusé** ).
* Contraintes (montant ≥ 0, multiple de 5 si XOF/XAF/…).

**Intégration**

* Initialisation : facture →** **`payment_attempts.created/redirected` +** **`payment_url`.
* **Webhook** : simulation POST** ****form-data** + header** **`x-token` correct/incorrect → résultat attendu (401 si mauvais HMAC). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/hmac "CinetPay X-TOKEN HMAC | CinetPay-Documentation"))
* **/payment/check** : mock succès (`ACCEPTED`) / échec (`REFUSED`) →** **`payments` +** **`invoices.status` mis à jour. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/verification "Checking a transaction | CinetPay-Documentation"))

**E2E (Playwright)**

* Client paie via** ****redirection** puis revient → facture** ****paid** (même si retour avant notification). ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/retour?utm_source=chatgpt.com "Prepare a return url"))
* **Re-tentative** après** ****WAITING_FOR_CUSTOMER** : pas de double encaissement ; idempotence webhook. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/notification "Prepare a notification page | CinetPay-Documentation"))

---

## 8) Risques & parades

* **HMAC non conforme** → suivre** ****ordre exact** de concaténation,** **`HMAC-SHA256` avec Secret Key, comparer à** **`x-token`.** ****Refuser 401** si mismatch. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/hmac "CinetPay X-TOKEN HMAC | CinetPay-Documentation"))
* **Notif multiples / délais opérateurs** →** ****idempotence** +** ****/payment/check** **obligatoire** avant MAJ. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/notification "Prepare a notification page | CinetPay-Documentation"))
* **iOS (cookies pop-up)** →** ****forçage redirection** plutôt que Seamless. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))
* **Montant invalide** (≠ multiple de 5) → valider côté serveur, message UX clair. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))
* **Dev local** sans IP publique → utiliser tunnel (ngrok/Cloudflare Tunnel) pour** **`notify_url` joignable.

---

## 9) Esquisses d’implémentation (condensé)

### 9.1 Init paiement (Route Handler)

```ts
// app/api/invoices/[id]/pay/route.ts
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const invoice = await db.selectInvoice(params.id, session.user.id); // RLS en lecture
  // validate currency & amount (multiple de 5 sauf USD)
  // build payload for init:
  const payload = {
    apikey: process.env.CINETPAY_APIKEY!,
    site_id: process.env.CINETPAY_SITE_ID!,
    transaction_id: invoice.number,          // unique & stable
    amount: Math.round(invoice.total_ttc),   // conforme
    currency: invoice.currency,
    description: `Facture ${invoice.number} - ${invoice.client_name}`,
    notify_url: process.env.CINETPAY_NOTIFY_URL!,
    return_url: process.env.CINETPAY_RETURN_URL!,
    channels: "ALL",
  };

  const r = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const data = await r.json();
  // persister payment_attempts + renvoyer payment_url / token
  return NextResponse.json(data);
}
```

(Exigences d’init & réponses CinetPay.) ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))

### 9.2 Webhook (HMAC + check)

```ts
// app/api/webhooks/cinetpay/route.ts
import crypto from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const headers = Object.fromEntries(req.headers);
  const xtoken = headers["x-token"];
  const form = await req.formData();

  // Reconstituer la chaîne EXACTE
  const fields = [
    "cpm_site_id","cpm_trans_id","cpm_trans_date","cpm_amount","cpm_currency","signature",
    "payment_method","cel_phone_num","cpm_phone_prefixe","cpm_language","cpm_version",
    "cpm_payment_config","cpm_page_action","cpm_custom","cpm_designation","cpm_error_message",
  ];
  const data = fields.map(k => String(form.get(k) ?? "")).join("");

  const token = crypto
    .createHmac("sha256", process.env.CINETPAY_SECRET_KEY!)
    .update(data, "utf8")
    .digest("hex");

  if (!xtoken || !crypto.timingSafeEqual(Buffer.from(xtoken), Buffer.from(token))) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  // Vérification serveur obligatoire
  const check = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: process.env.CINETPAY_APIKEY!,
      site_id: process.env.CINETPAY_SITE_ID!,
      transaction_id: form.get("cpm_trans_id"),
    }),
  });
  const res = await check.json();
  // Mettre à jour payments + invoice.status selon res.data.status (ACCEPTED/REFUSED/…)
  return NextResponse.json({ ok: true });
}
```

(HMAC** **`x-token`, concaténation,** ** **/payment/check** .) ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/hmac "CinetPay X-TOKEN HMAC | CinetPay-Documentation"))

---

## 10) Critères d’acceptation (mesurables)

* **Devis** : création, envoi,** ****acceptation** → génération de** ** **facture** .
* **Init paiement** :** **`payment_attempts` créé,** ****payment_url/token** reçu, redirection/Seamless OK. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/initialisation "Initiating a payment | CinetPay-Documentation"))
* **Webhook** : HMAC validé (`x-token`),** ****idempotence** respectée,** ****/payment/check** systématique, facture** ****`paid`**quand** **`ACCEPTED`. ([CinetPay Documentation](https://docs.cinetpay.com/api/1.0-en/checkout/notification "Prepare a notification page | CinetPay-Documentation"))
* **Reçus** : PDF disponible ; journaux (payloads) consultables.
* **RLS** : un client ne peut pas voir/payer la facture d’un autre ; admin voit tout. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

---

## 11) Ce qu’on livre en fin de Phase 3

* Migrations SQL** ****complètes** (quotes/invoices/items/payments/attempts +** ** **RLS** ). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* Composants UI** ****Devis/Factures** (client & admin) + génération PDF (serveur).
* Route Handlers :** ** **init paiement** ,** ** **webhook HMAC + /check** ,** ** **return_url** .
* Tests** ** **unitaires SQL** ,** ****intégration** (webhook),** ****E2E** (paiement bout-en-bout).

---

### Prochaine étape

Si tu valides la Phase 3, je passe à la** ****Phase 4 – Réclamations & Notifications** : table** **`tickets`, flux SLA, modèle de notification (mail), vues client/admin, et métriques de résolution.
