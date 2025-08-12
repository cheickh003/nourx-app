## Configuration

Ajoutez les variables d'environnement requises dans `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# CinetPay
CINETPAY_APIKEY=
CINETPAY_SITE_ID=
CINETPAY_SECRET_KEY=
CINETPAY_NOTIFY_URL=
CINETPAY_RETURN_URL=

# Base URL du site (utilisée côté serveur pour appeler les routes locales)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Démarrage

```bash
npm run dev
```
