# GPR — Gestion des Pièces & Réparations

Application interne pour le service de réparation automobile : stock de pièces, véhicules en réparation, registre des bons de demande, et carburant des détachements. Voir `CAHIER_DES_CHARGES.md` (besoin métier) et `ARCHITECTURE.md` (détail technique).

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Nécessite un fichier `.env.local` à la racine (non commité) :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

La dernière n'est nécessaire que pour la création de comptes (`/admin/comptes`).

## Base de données

Le schéma RLS (rôles, permissions par site) est dans `supabase/schema_rls.sql` — à exécuter une fois dans le SQL Editor du dashboard Supabase.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS).
