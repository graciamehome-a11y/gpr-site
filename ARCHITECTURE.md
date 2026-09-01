# Architecture — GPR (Gestion des Pièces & Réparations)

## 1. Vue d'ensemble

Application web interne de gestion des pièces de rechange, véhicules, carburant et bons de demande, pour un service de réparation automobile réparti sur plusieurs sites (Garage Central, D1 Nikki, D2 Bessassi) et une Réserve Comptable Matières.

## 2. Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Style | CSS Modules (un fichier `.module.css` par page) |
| Base de données | PostgreSQL, via Supabase |
| Authentification | Supabase Auth (email + mot de passe) |
| Sécurité des données | Row Level Security (RLS) PostgreSQL, par rôle |
| Hébergement prévu | Vercel |
| Gestion de version | Git / GitHub |

## 3. Structure des dossiers

```
gpr-site/
├── app/
│   ├── page.tsx                 # Tableau de bord ("/"), adapté au rôle de la personne connectée
│   ├── layout.tsx                # Layout global (inclut la Navbar)
│   ├── components/
│   │   ├── Navbar.tsx            # Barre de navigation (serveur) + infos utilisateur connecté
│   │   ├── NavLiens.tsx          # Liens de nav (client) avec état actif — usePathname
│   │   ├── icones.tsx            # Jeu d'icônes maison partagé (nav, tableau de bord, en-têtes)
│   │   └── ui.tsx                # Primitives : Carte, Section, Stat, Raccourci, Ligne, Badge…
│   ├── stock/
│   │   ├── page.tsx              # Stock des pièces par site (seuils d'alerte)
│   │   └── actions.ts            # definirStock()
│   ├── login/
│   │   ├── page.tsx              # Formulaire de connexion
│   │   └── actions.ts            # connexion() / deconnexion()
│   ├── vehicules/
│   │   ├── page.tsx              # Arrivée véhicule + pièces utilisées
│   │   └── actions.ts
│   ├── bons/
│   │   ├── page.tsx              # Registre des bons
│   │   ├── actions.ts
│   │   └── VehiculeSelect.tsx    # Composant client (menu + option "Autre")
│   ├── carburant/
│   │   ├── page.tsx              # Stock carburant par détachement
│   │   └── actions.ts
│   └── admin/
│       └── comptes/
│           ├── page.tsx          # Création de comptes (accès restreint)
│           └── actions.ts
├── lib/
│   ├── supabaseBrowserClient.ts  # Client navigateur (composants interactifs)
│   ├── supabaseServerClient.ts   # Client serveur (pages, respecte la session)
│   ├── supabaseAdminClient.ts    # Client "service_role" (admin uniquement)
│   └── getUtilisateurConnecte.ts # Récupère rôle/site de la personne connectée
├── proxy.ts                       # Redirige vers /login si non connecté
│                                   # (renommé depuis middleware.ts dans cette version de Next.js —
│                                   #  voir node_modules/next/dist/docs/.../file-conventions/proxy.md)
└── .env.local                     # Variables d'environnement (jamais commité)
```

## 4. Modèle de données (tables Supabase)

| Table | Rôle |
|---|---|
| `sites` | Garage Central, D1 Nikki, D2 Bessassi, Réserve Comptable Matières |
| `roles` | technicien, chef_detachement, chef_garage, comptable_matieres, chef_service_technique |
| `utilisateurs` | Comptes applicatifs, liés à `auth.users` via `auth_id`, avec `role_id` et `site_id` |
| `types_vehicules` | Nomenclature des types d'engins (SHACMAN VTT, VAB, CSK, KIA 450, etc.) |
| `pieces` | Catalogue des pièces, liées à un `type_vehicule_id` (ou génériques pour les lubrifiants) |
| `stocks` | Quantité réelle par pièce et par site (`piece_id` + `site_id`, unique) |
| `vehicules` | Véhicules physiques réels (immatriculation, type, site, statut) |
| `pieces_utilisees` | Historique des pièces consommées lors d'une réparation |
| `demandes_pieces` | Registre des bons (véhicule, pièce, quantité, statut, site) |
| `carburant_stock` | Solde gasoil/essence par détachement (D1 Nikki, D2 Bessassi uniquement) |
| `mouvements_carburant` | Historique des ravitaillements/consommations de carburant |

## 5. Authentification et permissions

- Chaque compte de connexion (`auth.users`, géré par Supabase Auth) est relié à une ligne `utilisateurs` via `auth_id`.
- Deux fonctions SQL utilitaires :
  - `mon_role()` → renvoie le rôle de la personne connectée
  - `mon_site()` → renvoie son site
- Ces fonctions sont utilisées dans les policies RLS de chaque table pour restreindre l'accès :
  - **Vue globale** (tous sites) : `chef_garage`, `comptable_matieres`, `chef_service_technique`
  - **Vue restreinte à son site** : `technicien`, `chef_detachement`
  - **Carburant** : règle différente — seuls `technicien`/`chef_detachement` (leur site) et `chef_service_technique` (les deux détachements) y ont accès ; `chef_garage` et `comptable_matieres` en sont exclus.
- La création de comptes se fait via `/admin/comptes`, réservée aux rôles à vue globale, en utilisant la clé `service_role` (jamais exposée au navigateur).

## 6. Points d'attention pour la suite du développement

- `lib/supabaseClient.ts` (client anon simple, sans session) a été retiré : toutes les pages utilisent désormais `supabaseServerClient.ts` pour que les RLS s'appliquent correctement.
- Design : Tailwind v4, base neutre + un seul accent (indigo, `--color-accent-*` dans `globals.css`) réservé aux actions et à la navigation active. Primitives partagées dans `app/components/ui.tsx`. Un prototype HTML validé avec le client sert de référence — à récupérer pour aligner les derniers détails.
- Aucune donnée réelle sensible (dotations par unité, quantités opérationnelles réelles) ne doit être saisie tant que le client n'a pas validé l'hébergement et le traitement de ce niveau de détail.

## 7. Variables d'environnement nécessaires (`.env.local`, non commité)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

La clé `SUPABASE_SERVICE_ROLE_KEY` doit être partagée entre collaborateurs par un canal privé (jamais via GitHub).

## 8. Lancer le projet en local

```bash
npm install
npm run dev
```

Le site est accessible sur `http://localhost:3000`.
