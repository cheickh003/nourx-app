# Phase 5 — Sécurité (durcissement), Observabilité (Sentry + PostHog + OTel), QA & Go-Live

Objectif :** ** **verrouiller l’app** ,** ****voir tout ce qui se passe** (erreurs, perfs, usage),** ** **tester à fond** , puis** ** **déployer proprement** . Stack visée : Next.js App Router (Route Handlers, Middleware), Supabase (Postgres/RLS, Backups), Sentry, PostHog, OpenTelemetry, Docker/PM2 (selon hébergeur).

---

## 1) Durcissement sécurité (Next.js + Proxy)

### 1.1 En-têtes HTTP (obligatoires)

À appliquer via** **`next.config.(js|mjs)` →** **`headers()` pour toutes les routes :

* **HSTS** : force HTTPS, empêche le downgrade (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`). Réf MDN. ([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security?utm_source=chatgpt.com "Strict-Transport-Security header - HTTP - MDN Web Docs"))
* **CSP (Content-Security-Policy)** :** ***whitelist stricte* des sources (`default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none' …`) +** ** **nonce** /hash pour les scripts. Guide officiel Next. ([Next.js](https://nextjs.org/docs/app/guides/content-security-policy?utm_source=chatgpt.com "Guides: Content Security Policy"))
* **Referrer-Policy** (`strict-origin-when-cross-origin`) pour limiter les fuites du referer. ([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy?utm_source=chatgpt.com "Referrer-Policy header - HTTP - MDN Web Docs"))
* **Permissions-Policy** (ex.** **`camera=(), geolocation=(), microphone=()`) pour désactiver les capteurs. ([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy?utm_source=chatgpt.com "Permissions-Policy header - HTTP - MDN Web Docs"))
* **X-Content-Type-Options: nosniff** ,** ** **X-Frame-Options: DENY** , etc. (via** **`headers()` ou lib dédiée). ([Next.js](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers?utm_source=chatgpt.com "next.config.js Options: headers"),** **[MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers?utm_source=chatgpt.com "HTTP headers - MDN Web Docs - Mozilla"))

**Aides pratiques**

* `@next-safe/middleware` pour générer/enforcer une** ****CSP stricte** (nonce/hash) sans custom server. ([Next Safe Middleware](https://next-safe-middleware.vercel.app/?utm_source=chatgpt.com "@next-safe/middleware"))
* **Retirer** `x-powered-by` (fingerprinting) :** **`poweredByHeader:false` dans** **`next.config`. ([Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/poweredByHeader?utm_source=chatgpt.com "poweredByHeader - next.config.js"))

### 1.2 Anti-abuse : rate-limit & bot-gate

* **Rate-limit** global + par IP sur les endpoints sensibles (`/api/invoices/*`,** **`/api/tickets/*`,** **`/api/auth/*`) :
  * Edge/Middleware +** ****Upstash Ratelimit** (KV/Redis) — simple et serverless-friendly. ([Upstash: Serverless Data Platform](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview?utm_source=chatgpt.com "Overview - Upstash Documentation"))
* **CAPTCHA invisible** sur formulaires publics (contact, réclamations anonymes si un jour) :** ** **Cloudflare Turnstile** (léger, no-CAPTCHA UX). ([Cloudflare Docs](https://developers.cloudflare.com/turnstile/?utm_source=chatgpt.com "Overview · Cloudflare Turnstile docs"))

### 1.3 Route Handlers & uploads

* **Route Handlers** (App Router) utilisent l’API Web** **`Request/Response` (GET/POST/PUT/…); si vous recevez des** **`multipart/form-data`, lisez/bufferisez proprement côté Node. ([Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route?utm_source=chatgpt.com "File-system conventions: route.js"))
* **Pièces jointes** (tickets, documents) : bucket** ** **privé** ,** ****URL signées** courtes côté lecture (vous l’avez déjà en Phase 4), et (option) scan AV côté worker si vous le souhaitez.

### 1.4 Données & secrets

* **RLS Supabase** reste votre** ***défense en profondeur* (client ne voit que ses ressources). Revérifier les policies sur toutes les nouvelles tables. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* **Variables d’environnement** : exposer au navigateur** ****uniquement** celles préfixées** **`NEXT_PUBLIC_`; tout le reste** ****serveur only** (et non commité). ([Next.js](https://nextjs.org/docs/pages/guides/environment-variables?utm_source=chatgpt.com "Guides: Environment Variables"))

---

## 2) Observabilité – erreurs, perfs, usage

### 2.1 Sentry (erreurs + traces Next.js)

* Installer** ****`@sentry/nextjs`** (client + serveur) avec l’**instrumentation** Next (`instrumentation.ts`) pour capter** ****erreurs** et** ****traces** (Server Actions, Route Handlers). ([docs.sentry.io](https://docs.sentry.io/platforms/javascript/guides/nextjs/?utm_source=chatgpt.com "Sentry for Next.js"),** **[Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation?utm_source=chatgpt.com "File-system conventions: instrumentation.js"))
* **Source maps** : laisser le SDK** ****générer & uploader automatiquement** pour stacktraces lisibles (ne pas servir publiquement via** **`productionBrowserSourceMaps` si inutile). ([docs.sentry.io](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/?utm_source=chatgpt.com "Source Maps | Sentry for Next.js"),** **[Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/productionBrowserSourceMaps?utm_source=chatgpt.com "next.config.js: productionBrowserSourceMaps"))

### 2.2 PostHog (analytics produit, flags, replays)

* Guide** ****Next.js** officiel : événements,** ** *autocapture* ,** ** **feature flags** ,** ****Session Replay** (en option) ; utile pour voir comment vos clients utilisent l’espace. Choisir** ****Cloud EU (Frankfurt)** pour la résidence des données. ([posthog.com](https://posthog.com/docs/libraries/next-js?utm_source=chatgpt.com "Next.js - Docs"))
* **Session replay** : activer côté PostHog si besoin (peut être coupé par projet/role). ([posthog.com](https://posthog.com/docs/session-replay/installation?utm_source=chatgpt.com "Session replay installation - Docs"))

### 2.3 OpenTelemetry (bonus)

* Next.js fournit un** ****guide OTel** + hook** **`instrumentation.ts` → vous pouvez exporter les traces vers Axiom/Grafana/etc. (optionnel si Sentry couvre déjà votre besoin). ([Next.js](https://nextjs.org/docs/app/guides/open-telemetry?utm_source=chatgpt.com "Guides: OpenTelemetry"),** **[OpenTelemetry](https://opentelemetry.io/docs/languages/js/instrumentation/?utm_source=chatgpt.com "Instrumentation"))

---

## 3) QA — tests & qualité

### 3.1 Tests auto

* **Unitaires** (utils, validations) +** ****Component** (UI shadcn) +** ****E2E** (scénarios client/admin) avec** ****Playwright** (guide officiel Next). ([Next.js](https://nextjs.org/docs/pages/guides/testing/playwright?utm_source=chatgpt.com "Testing: Playwright"))
* Cas E2E clés :
  * Connexion, navigation dashboard.
  * RLS : un client ne peut** ****jamais** voir un autre (injection d’ID ⇒ 403).
  * Paiement : init → retour → webhook (idempotence) → facture =** **`paid`.
  * Tickets : création + message admin en** ** **temps réel** .

### 3.2 Perf & charge

* **k6** pour les** ****tests de charge** : smoke (p95 < X ms), palier (N CCU),** ** *spike* . ([Grafana Labs](https://grafana.com/docs/k6/latest/?utm_source=chatgpt.com "Grafana k6 documentation"))

### 3.3 Sécurité applicative

* Revue** ****OWASP Top 10** : injection, contrôle d’accès cassé, XSS, etc. (checklist de mitigation par composant). ([owasp.org](https://owasp.org/Top10/?utm_source=chatgpt.com "OWASP Top 10:2021"))

---

## 4) Déploiement & Go-Live

### 4.1 Build / Runtime

* **Docker** recommandé : Next** ****`output: 'standalone'`** pour des images compactes; déploiement sur n’importe quel orchestrateur. ([Next.js](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output?utm_source=chatgpt.com "next.config.js Options: output"))
* Si VM bare-metal, utilisez** ****PM2** (watchdog, reload sans downtime) derrière un reverse-proxy TLS (Nginx/Caddy). ([pm2.keymetrics.io](https://pm2.keymetrics.io/docs/usage/quick-start/?utm_source=chatgpt.com "Quick Start - PM2"),** **[pm2.io](https://pm2.io/docs/runtime/overview/?utm_source=chatgpt.com "Overview | PM2 Documentation"))

### 4.2 Sécurité au bord (proxy/CDN)

* Forcer** ****HTTPS** + HSTS au niveau proxy aussi (cohérence avec l’app). ([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security?utm_source=chatgpt.com "Strict-Transport-Security header - HTTP - MDN Web Docs"))
* Ajoutez le** ****rate-limit** côté edge si dispo (ex. KV/Edge middleware). ([Vercel](https://vercel.com/templates/edge-middleware/middleware-rate-limit?utm_source=chatgpt.com "Vercel Edge Middleware Rate Limit"))

### 4.3 Backups & restauration (Supabase)

* **Backups gérés** (quotidiens + options PITR selon plan) depuis le dashboard ; possibilité d’**automatiser via CLI/CI** pour exports logiques. ([Supabase](https://supabase.com/docs/guides/platform/backups?utm_source=chatgpt.com "Database Backups | Supabase Docs"))

### 4.4 Supervision & alerting

* **Uptime Kuma** (auto-hébergé) pour pings HTTP/keywords + alertes. ([uptime.kuma.pet](https://uptime.kuma.pet/?utm_source=chatgpt.com "Uptime Kuma"))
* **Sentry** : alertes erreurs/perfs (taux d’erreurs, p95/TTFB). ([docs.sentry.io](https://docs.sentry.io/?utm_source=chatgpt.com "Sentry Docs | Application Performance Monitoring &amp; Error ..."))
* **PostHog** : dashboard usage + flags (progressive rollout). ([posthog.com](https://posthog.com/docs/libraries/next-js?utm_source=chatgpt.com "Next.js - Docs"))

---

## 5) Plan d’implémentation (checklist exécutable)

### A) Sécurité technique

1. **`next.config`** :** **`poweredByHeader:false` +** **`headers()` (HSTS, XFO, XCTO, Referrer-Policy, Permissions-Policy). ([Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/poweredByHeader?utm_source=chatgpt.com "poweredByHeader - next.config.js"))
2. **CSP stricte** : déployer** **`@next-safe/middleware` (nonce/hash), activer** ****Report-Only** en pré-prod puis** ***enforce* en prod. ([Next Safe Middleware](https://next-safe-middleware.vercel.app/?utm_source=chatgpt.com "@next-safe/middleware"))
3. **Rate-limit** global via** ****Middleware** (Upstash Ratelimit) +** ***burst* custom sur webhook CinetPay (on** ***n* garde permissif mais journalisé). ([Upstash: Serverless Data Platform](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview?utm_source=chatgpt.com "Overview - Upstash Documentation"))
4. **Turnstile** sur formulaires externes (si ouverts). ([Cloudflare Docs](https://developers.cloudflare.com/turnstile/?utm_source=chatgpt.com "Overview · Cloudflare Turnstile docs"))
5. **Audit RLS** sur toutes les tables introduites en Phases 3-4. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))

### B) Observabilité

6. **Sentry** : SDK Next.js +** **`instrumentation.ts`; DSN env** ** **serveur** ;** ****upload source maps** activé (wizard). ([docs.sentry.io](https://docs.sentry.io/platforms/javascript/guides/nextjs/?utm_source=chatgpt.com "Sentry for Next.js"))
7. **PostHog** : init lib Next.js,** ** **Cloud EU** ; events clés (connexion, vue projet, paiement réussi, ticket créé), (option)** ** **Session Replay** . ([posthog.com](https://posthog.com/eu?utm_source=chatgpt.com "PostHog Cloud EU"))
8. (Option)** ****OpenTelemetry** export → votre backend de traces si besoin. ([Next.js](https://nextjs.org/docs/app/guides/open-telemetry?utm_source=chatgpt.com "Guides: OpenTelemetry"))

### C) QA & perfs

9. **Playwright** branch E2E : scénarios client/admin + assertions sur** ****en-têtes sécurité** (CSP/HSTS présents). ([Next.js](https://nextjs.org/docs/pages/guides/testing/playwright?utm_source=chatgpt.com "Testing: Playwright"))
10. **k6** : script palier + spike sur** **`/api/invoices/:id/pay` et** **`/api/webhooks/cinetpay` (mocks). ([Grafana Labs](https://grafana.com/docs/k6/latest/?utm_source=chatgpt.com "Grafana k6 documentation"))

### D) Déploiement

11. **Docker** (`output:'standalone'`) + reverse-proxy TLS (HSTS). Si non-Docker :** ** **PM2** . ([Next.js](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output?utm_source=chatgpt.com "next.config.js Options: output"),** **[pm2.keymetrics.io](https://pm2.keymetrics.io/docs/usage/quick-start/?utm_source=chatgpt.com "Quick Start - PM2"))
12. **Backups** : vérifier rétention Supabase & activer dump CLI programmé (CI nocturne). ([Supabase](https://supabase.com/docs/guides/platform/backups?utm_source=chatgpt.com "Database Backups | Supabase Docs"))
13. **Uptime** : monitor HTTP + statut clé “/healthz”. ([uptime.kuma.pet](https://uptime.kuma.pet/?utm_source=chatgpt.com "Uptime Kuma"))

---

## 6) Critères d’acceptation (mesurables)

* **Sécurité**
  * Réponses HTTP comportent** ** **HSTS** ,** ****CSP** (sans violation),** ** **Referrer-Policy** ,** ** **X-Frame-Options** ,** ****X-Content-Type-Options** ; header** **`x-powered-by` absent. ([MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security?utm_source=chatgpt.com "Strict-Transport-Security header - HTTP - MDN Web Docs"),** **[Next.js](https://nextjs.org/docs/app/guides/content-security-policy?utm_source=chatgpt.com "Guides: Content Security Policy"))
  * **Rate-limit** renvoie 429 au-delà du seuil défini sur endpoints publics. ([Upstash: Serverless Data Platform](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview?utm_source=chatgpt.com "Overview - Upstash Documentation"))
  * **RLS** : tentatives d’accès cross-client** ****refusées** (tests automatiques). ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"))
* **Observabilité**
  * **Sentry** affiche erreurs serveur/cliente + traces ;** ****source maps** correctement associées. ([docs.sentry.io](https://docs.sentry.io/platforms/javascript/guides/nextjs/?utm_source=chatgpt.com "Sentry for Next.js"))
  * **PostHog** : tableau de bord “Activation & Paiement” (events), flags opérationnels ;** ****EU region** confirmée. ([posthog.com](https://posthog.com/eu?utm_source=chatgpt.com "PostHog Cloud EU"))
* **QA/Perf**
  * *E2E green* (parcours paiement + tickets). Guide Playwright suivi. ([Next.js](https://nextjs.org/docs/pages/guides/testing/playwright?utm_source=chatgpt.com "Testing: Playwright"))
  * **k6** : p95 sous la cible sur X vus/s ; aucune erreur HTTP > 1%. ([Grafana Labs](https://grafana.com/docs/k6/latest/?utm_source=chatgpt.com "Grafana k6 documentation"))
* **Ops**
  * **Backups** visibles dans Supabase (rétention conforme) + dump CI chiffré. ([Supabase](https://supabase.com/docs/guides/platform/backups?utm_source=chatgpt.com "Database Backups | Supabase Docs"))
  * **Uptime** alertes opérationnelles. ([uptime.kuma.pet](https://uptime.kuma.pet/?utm_source=chatgpt.com "Uptime Kuma"))

---

## 7) Notes d’implémentation rapides (exemples)

* **Headers Next** (extrait) : via** **`headers()` dans** **`next.config` pour appliquer HSTS/Referrer-Policy/Permissions-Policy/XFO/XCTO globalement. ([Next.js](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers?utm_source=chatgpt.com "next.config.js Options: headers"))
* **CSP** : commencer en** ****Report-Only** (collecter les violations), puis passer en** ****enforce** une fois la liste blanche stabilisée, avec** **`@next-safe/middleware`. ([Next Safe Middleware](https://next-safe-middleware.vercel.app/?utm_source=chatgpt.com "@next-safe/middleware"))
* **Sentry** : utiliser le** ****wizard** pour auto-config (client/server init + sourcemaps). ([docs.sentry.io](https://docs.sentry.io/platforms/javascript/guides/nextjs/?utm_source=chatgpt.com "Sentry for Next.js"))
* **PostHog** : suivre le guide** ****Next.js** (App Router inclus) ; activer** ****Session Replay** si besoin support/UX. ([posthog.com](https://posthog.com/docs/libraries/next-js?utm_source=chatgpt.com "Next.js - Docs"))
* **Rate-limit** :** ****Upstash Ratelimit** côté Middleware (clé : IP + path) ; ajuster fenêtres/quotas par route. ([Upstash: Serverless Data Platform](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview?utm_source=chatgpt.com "Overview - Upstash Documentation"))
* **Backups** : vérifier** ****PITR** si critère RPO serré ; sinon backups quotidiens suffisent (selon plan). ([Supabase](https://supabase.com/features/database-backups?utm_source=chatgpt.com "Database backups | Supabase Features"))

---

## 8) Deliverables Phase 5

* `next.config` sécurisé +** ****CSP stricte** en production. ([Next.js](https://nextjs.org/docs/app/guides/content-security-policy?utm_source=chatgpt.com "Guides: Content Security Policy"))
* **Middleware** de** ****rate-limit** +** ****Turnstile** sur formulaires ouverts. ([Upstash: Serverless Data Platform](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview?utm_source=chatgpt.com "Overview - Upstash Documentation"),** **[Cloudflare Docs](https://developers.cloudflare.com/turnstile/?utm_source=chatgpt.com "Overview · Cloudflare Turnstile docs"))
* **Sentry** opérationnel (erreurs + traces +** ** **source maps** ). ([docs.sentry.io](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/?utm_source=chatgpt.com "Source Maps | Sentry for Next.js"))
* **PostHog** en** ****Cloud EU** avec events clés & (option) replays. ([posthog.com](https://posthog.com/eu?utm_source=chatgpt.com "PostHog Cloud EU"))
* **Playwright** E2E,** ****k6** charge,** ** **Uptime Kuma** . ([Next.js](https://nextjs.org/docs/pages/guides/testing/playwright?utm_source=chatgpt.com "Testing: Playwright"),** **[Grafana Labs](https://grafana.com/docs/k6/latest/?utm_source=chatgpt.com "Grafana k6 documentation"),** **[uptime.kuma.pet](https://uptime.kuma.pet/?utm_source=chatgpt.com "Uptime Kuma"))
* **Backups Supabase** vérifiés + dump automatisé (CI). ([Supabase](https://supabase.com/docs/guides/platform/backups?utm_source=chatgpt.com "Database Backups | Supabase Docs"))

---

Si tu valides cette Phase 5, je passe à la** ****Phase 6 — Documentation interne & Runbook d’exploitation** (procédures incidents, rotation de clés, plan de release, versioning schéma, et checklist “Day-2”).
