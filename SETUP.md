# Configuration NOURX App - Phase 1

## 📋 Pré-requis

- Node.js 18+ 
- npm ou pnpm
- Docker (optionnel pour Supabase local)
- Compte Supabase (pour hébergé)

## 🚀 Installation

1. **Installer les dépendances**
```bash
npm install
```

2. **Configuration Supabase**

### Option A: Projet Supabase hébergé (Recommandé)
1. Créez un projet sur [supabase.com](https://supabase.com)
2. Récupérez vos clés dans Settings > API
3. Copiez le `.env.local.example` vers `.env.local`
4. Remplissez vos vraies clés Supabase

### Option B: Supabase local
```bash
# Démarrer Supabase localement
supabase start
```

3. **Exécuter les migrations**
```bash
# Appliquer le schéma de base de données
supabase migration up
```

4. **Démarrer l'application**
```bash
npm run dev
```

## 🗃️ Structure de la base de données (Phase 1)

### Tables principales :
- `profiles` - Profils utilisateur (admin/client)  
- `clients` - Clients/entreprises
- `client_members` - Liaison utilisateurs ↔ clients
- `projects` - Projets clients
- `documents` - Documents projets (préparé pour Phase 2)
- `audit_logs` - Logs d'audit

### Row Level Security (RLS)
✅ Activé sur toutes les tables  
✅ Policies admin (accès total)  
✅ Policies client (accès restreint aux données liées)

### Storage Supabase
✅ Bucket privé `project-files`  
✅ Policies basées sur membership

## 🎨 Interface Utilisateur

### Client (`/dashboard`, `/projet`, etc.)
- Navigation latérale avec sections complètes
- Design N/B avec accent bleu NOURX
- Composants shadcn/ui

### Admin (`/admin/projets`, `/admin/clients`, etc.)
- Interface d'administration séparée
- Accès à toutes les données
- Gestion multi-clients

## 🔐 Authentification

- **SSR avec cookies** (sécurisé)
- **Middleware** protection des routes
- **Redirections automatiques** selon le rôle (admin → `/admin/projets`, client → `/dashboard`)

## 🧪 Tests Phase 1 (Critères d'acceptation)

- ✅ **Build** : `npm run build` réussit
- ✅ **Auth SSR** : Connexion/déconnexion fonctionnelles
- ✅ **RLS** : Isolation des données par client
- ✅ **Storage** : Upload sécurisé + URL signées
- ✅ **Squelettes** : Toutes les pages Client/Admin

## 🚧 Prochaines étapes

**Phase 2** : Projets, Roadmap, Tâches, Documents (CRUD + Realtime)
**Phase 3** : Devis/Factures + CinetPay  
**Phase 4** : Réclamations & Notifications
**Phase 5** : Sécurité, monitoring, QA & Go-Live

## 📝 Configuration requise

1. **Variables d'environnement** (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. **Créer un utilisateur admin**
Après l'inscription, modifiez le rôle dans la base :
```sql
UPDATE profiles SET role = 'admin' WHERE user_id = 'uuid_du_user';
```

## 🆘 Dépannage

- **Erreur Supabase URL** → Vérifiez `.env.local`
- **RLS Deny** → Vérifiez les policies et memberships  
- **Tailwind non appliqué** → Vérifiez `globals.css` et `postcss.config.mjs`
