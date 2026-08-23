# Récap — Authentification, permissions, design (2026-08-23)

## 0. Stack 100% locale (Docker) + comptes de test — mise à jour du même jour

Tu voulais un mot de passe de test et pouvoir tout faire tourner en local avec Docker. Comme Docker était déjà utilisé sur cette machine pour d'autres projets Supabase, j'ai monté un **stack Supabase local dédié à gpr-site** (Postgres + Auth + API, dans des conteneurs Docker séparés du projet cloud) plutôt que de te donner un mot de passe pour le vrai compte `graciamehome@gmail.com` — que je ne connais pas et ne peux pas récupérer sans la clé `service_role` du projet cloud.

**5 comptes de test, un par rôle, mot de passe identique :**

| Email | Rôle | Site |
|---|---|---|
| `technicien@test.local` | Technicien | D1 Nikki |
| `chef.detachement@test.local` | Chef de détachement | D2 Bessassi |
| `chef.garage@test.local` | Chef Garage | Garage Central |
| `comptable.matieres@test.local` | Comptable Matières | Réserve Comptable Matières |
| `chef.technique@test.local` | Chef Service Technique | — (vue globale) |

**Mot de passe pour les 5 : `Test1234!`**

Connecte-toi sur `http://localhost:3000/login` (serveur `npm run dev`, déjà relancé sur le stack local) ou `http://localhost:3001/login` (version Docker de l'appli elle-même, voir plus bas) avec n'importe lequel de ces comptes pour voir l'app filtrée selon ce rôle.

### Ce que j'ai vérifié concrètement (pas juste "ça devrait marcher")

J'ai testé les permissions directement contre la base locale, connecté tour à tour avec chaque rôle :
- Technicien (D1 Nikki) : ne voit que les véhicules et le carburant de D1 Nikki — confirmé.
- Chef Garage : voit tous les véhicules (tous sites), mais **aucune** ligne de carburant (règle §5 du cahier des charges) — confirmé.
- Chef Service Technique : voit le carburant des deux détachements — confirmé.
- Anonyme (pas connecté) : ne peut rien lire, y compris `utilisateurs` — confirmé (c'était l'ancienne fuite de l'audit, maintenant fermée).

### Comment ça marche

- `supabase/migrations/` : schéma complet des 11 tables (reconstitué depuis les colonnes utilisées par le code, faute d'accès direct au schéma exact du projet cloud) + les RLS + les GRANTs nécessaires.
- `supabase/seed.sql` : sites, rôles, types de véhicules, quelques pièces — mêmes valeurs que celles observées sur le projet cloud.
- `scripts/seed-comptes-test.mjs` : crée les 5 comptes de test ci-dessus (déjà exécuté).
- Le stack tourne via le CLI Supabase (lui-même basé sur Docker) : API sur `http://127.0.0.1:55321`, Studio (interface d'admin de la base) sur `http://127.0.0.1:55323`, emails de test interceptés sur `http://127.0.0.1:55324` (rien ne part jamais vers une vraie boîte mail).
- `.env.development.local` (nouveau, jamais commité) pointe `npm run dev` vers ce stack local — **`.env.local` (tes vraies clés cloud) n'a pas été touché**, il reprendra le dessus si tu supprimes `.env.development.local`.

### Commandes utiles

```bash
supabase status        # revoir les URLs/clés locales
supabase stop           # arrêter le stack local (libère les ressources Docker)
supabase start           # le relancer
supabase db reset        # tout recréer proprement (schéma + seed) si tu modifies les migrations
supabase studio           # http://127.0.0.1:55323 — interface graphique pour voir/éditer les données
```

### L'appli elle-même en Docker

`Dockerfile` + `docker-compose.yml` construisent une image de prod de l'appli Next.js (déjà buildée et testée — tourne sur **`http://localhost:3001`**, en parallèle du `npm run dev` sur le port 3000). Piège réseau résolu au passage : le navigateur et le serveur Next.js (dans le conteneur) n'atteignent pas le stack Supabase local par la même adresse (`localhost` à l'intérieur d'un conteneur Docker ne désigne pas la machine hôte) — voir `lib/supabaseUrl.ts` pour le détail.

```bash
set -a && source .env.development.local && set +a   # ou l'équivalent PowerShell : charger les 3 variables en env
docker compose up -d --build
```

⚠️ Cette histoire d'adresse réseau différente ne concerne QUE Docker. Avec `npm run dev` tout simplement, ça marche sans rien faire de spécial (déjà en place, déjà testé).

---


Ce qui a été construit aujourd'hui, en plus de l'audit initial (`AUDIT.md`). Fichiers nouveaux/modifiés listés en fin de document.

## 1. Authentification et permissions

- **Connexion** : `/login` (email + mot de passe Supabase Auth). Toute page est protégée par `proxy.ts` (le nom de `middleware.ts` a changé dans cette version de Next.js — voir `node_modules/next/dist/docs/.../file-conventions/proxy.md`) : non connecté → redirection automatique vers `/login`.
- **Clients Supabase** séparés comme prévu par `ARCHITECTURE.md` : `lib/supabaseServerClient.ts` (session côté serveur, RLS active), `lib/supabaseBrowserClient.ts` (composants client), `lib/supabaseAdminClient.ts` (`service_role`, admin uniquement). `lib/supabaseClient.ts` (l'ancien client anonyme sans session) a été supprimé — plus aucune page ne l'utilise.
- **`lib/getUtilisateurConnecte.ts`** : récupère rôle + site de la personne connectée, utilisé partout pour filtrer l'affichage et les formulaires (ex. le sélecteur de site n'apparaît que pour les rôles à vue globale — un technicien n'a rien à choisir, son site est déjà connu).
- **`supabase/schema_rls.sql`** ⚠️ **à exécuter par toi** (Dashboard Supabase → SQL Editor → coller → Run) : je n'ai que la clé anonyme, pas d'accès direct à ta base pour l'appliquer moi-même. Ce script :
  - crée `mon_role()` / `mon_site()` (fonctions utilisées par les policies),
  - active RLS sur les 11 tables et repart d'une base propre (supprime les anciennes policies),
  - referme l'accès public en lecture trouvé dans l'audit (§7bis — la table `utilisateurs` avec des emails réels était lisible par n'importe qui),
  - applique le filtrage rôle/site du cahier des charges (§3) sur chaque table,
  - exclut carburant pour Garage Central / Comptable Matières (règle §5),
  - ajoute `ajuster_carburant_stock()`, une fonction SQL atomique qui remplace le read-then-write bugué (AUDIT.md §3.5).

**Tant que ce script n'est pas exécuté**, la base reste dans l'état trouvé par l'audit (lecture publique ouverte) même si l'appli, elle, est maintenant protégée par le login. Les deux corrections sont complémentaires — il faut les deux.

## 2. Espace admin

`/admin/comptes` (visible uniquement pour Chef Garage / Comptable Matières / Chef Service Technique, comme l'exige le cahier des charges §4.5) : liste les comptes existants, formulaire de création (email, nom, rôle, site) qui envoie une invitation par email via `supabase.auth.admin.inviteUserByEmail`. **Nécessite `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`** (non fournie pour l'instant) — sans elle, la création de compte échoue avec un message clair, le reste du site n'est pas affecté.

## 3. Design — mobile-first, minimaliste, peu de taps

- Tailwind CSS partout (les anciens fichiers `page.module.css` et les styles inline ont été retirés), palette neutre + une seule couleur d'accent par état (vert/rouge/ambre pour les statuts).
- Barre de navigation adaptative : liens texte en haut sur desktop, **barre d'icônes fixée en bas sur mobile** (accès direct à chaque module en un tap).
- Changement de statut (bon, véhicule) : **boutons à un seul tap** au lieu du couple liste déroulante + bouton « OK » d'avant.
- Champs supprimés des formulaires car déductibles de la session : « Votre nom » (Véhicules, Bons, Carburant) et « Site » quand le rôle est restreint à un seul site — la personne connectée n'a plus à les ressaisir.
- Illustration simple (trait, pas de remplissage) sur les listes vides, pas de skeuomorphisme.
- Boutons/champs dimensionnés pour le tactile (zone de tap ≥ 44px), `autoFocus` sur le premier champ de chaque formulaire.

## 4. Stock — écart comblé

L'ancienne page Stock listait le catalogue de pièces mais n'affichait aucune quantité par site (contraire au cahier des charges §4.1). Elle utilise maintenant la table `stocks` (quantité + seuil d'alerte par pièce et par site), avec mise en évidence visuelle des pièces sous le seuil.

## 5. Vérifications faites

- `npx tsc --noEmit` → aucune erreur.
- `npm run lint` → aucune erreur.
- Serveur relancé proprement (`.next` vidé) : `/` sans session redirige bien vers `/login` (HTTP 307), `/login` répond 200 sans erreur serveur.
- Je n'ai **pas** pu tester le flux connecté de bout en bout (je n'ai pas le mot de passe du compte existant `graciamehome@gmail.com`, et l'extension Chrome n'est pas connectée dans cet environnement pour un test visuel). À faire de ton côté.

## 6. Ce qu'il te reste à faire

1. **Exécuter `supabase/schema_rls.sql`** dans le SQL Editor Supabase (le point le plus important — sans ça la fuite de données de l'audit reste ouverte).
2. Te connecter sur `http://localhost:3000/login` avec un compte existant (ex. `graciamehome@gmail.com`, rôle Chef Service Technique) pour vérifier le rendu réel sur mobile et desktop.
3. Ajouter `SUPABASE_SERVICE_ROLE_KEY` à `.env.local` si tu veux tester la création de comptes depuis `/admin/comptes`.
4. Vérifier que l'envoi d'email d'invitation fonctionne bien pour ton projet Supabase (dépend de la config SMTP du projet — à tester une fois la clé `service_role` ajoutée).

## 7. Fichiers créés / modifiés

**Nouveaux** : `proxy.ts`, `supabase/schema_rls.sql`, `lib/supabaseServerClient.ts`, `lib/supabaseBrowserClient.ts`, `lib/supabaseAdminClient.ts`, `lib/getUtilisateurConnecte.ts`, `app/login/page.tsx`, `app/login/actions.ts`, `app/components/Navbar.tsx`, `app/components/ui.tsx`, `app/admin/comptes/page.tsx`, `app/admin/comptes/actions.ts`, `app/actions.ts`.

**Modifiés** : `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/vehicules/page.tsx` + `actions.ts`, `app/bons/page.tsx` + `actions.ts` + `VehiculeSelect.tsx`, `app/carburant/page.tsx` + `actions.ts`, `ARCHITECTURE.md`, `README.md`, `AUDIT.md`, `package.json` (ajout `@supabase/ssr`).

**Supprimés** : `lib/supabaseClient.ts`, les 4 `page.module.css`, les icônes boilerplate `create-next-app` dans `public/`.
