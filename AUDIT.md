# Audit — Site GPR (Gestion des Pièces & Réparations)

Date : 2026-08-23
Portée : code source du dépôt (2 commits, branche `main`, working tree propre). Aucune clé `.env` fournie au moment de cet audit — voir section 7.

## 0. Mise à jour (2026-08-23, même jour) — chantier auth/RLS/design réalisé

Suite à cet audit, l'ensemble des points bloquants ci-dessous a été implémenté : authentification Supabase, `proxy.ts` (protection des routes), clients serveur/admin respectant la session, `getUtilisateurConnecte()`, filtrage par rôle/site, espace `/admin/comptes`, et une refonte mobile-first minimaliste des 4 pages. Détails et actions restantes à ta charge dans **`RECAP_IMPLEMENTATION.md`** à la racine — ce fichier `AUDIT.md` reste tel quel comme trace de l'état initial constaté.

## 1. Résumé

Le projet est un squelette fonctionnel Next.js/Supabase qui couvre 3 des 4 modules métier (Stock, Véhicules, Bons, Carburant), sans authentification, sans respect des permissions par rôle et sans validation d'entrée. C'est cohérent avec un tout début de développement (le `README.md` est encore celui généré par `create-next-app`), mais l'écart avec `ARCHITECTURE.md` est important : ce document décrit une architecture cible (login, middleware, RLS, admin) qui **n'existe pas encore dans le code**. À ce stade, **toute personne connaissant l'URL du site peut lire et modifier toutes les données**, quel que soit son rôle.

| Zone | État |
|---|---|
| Modules Stock / Véhicules / Bons / Carburant | ✅ Implémentés (CRUD de base) |
| Authentification (login/déconnexion) | ❌ Absente |
| Middleware de protection des routes | ❌ Absent |
| Client Supabase respectant la session/RLS | ❌ Absent (un seul client, clé anonyme, sans session) |
| Permissions par rôle/site | ❌ Absentes côté application |
| Espace admin (création de comptes) | ❌ Absent |
| Validation des entrées serveur | ❌ Absente |
| Tests / CI | ❌ Absents |
| `.env.local` / secrets | ⏳ Pas encore fourni |

## 2. Écart architecture documentée vs. code réel

`ARCHITECTURE.md` décrit ces fichiers, qu'on ne trouve pas dans le dépôt :

- `app/actions.ts`, `app/components/Navbar.tsx`
- `app/login/page.tsx`, `app/login/actions.ts`
- `app/admin/comptes/page.tsx`, `app/admin/comptes/actions.ts`
- `lib/supabaseBrowserClient.ts`, `lib/supabaseServerClient.ts`, `lib/supabaseAdminClient.ts`, `lib/getUtilisateurConnecte.ts`
- `middleware.ts`

Seul `lib/supabaseClient.ts` (le client « hérité » que le doc dit vouloir retirer) existe, et **c'est lui qui est utilisé partout** (`app/page.tsx`, `vehicules`, `bons`, `carburant`, et toutes leurs `actions.ts`).

**Recommandation** : soit c'est le prochain chantier prévu (auth + RLS), soit la doc a été écrite en avance sur le code — à clarifier avec l'utilisateur avant d'aller plus loin, mais dans tous les cas c'est le point bloquant avant toute mise en production ou saisie de données réelles (le cahier des charges l'interdit explicitement tant que ce n'est pas en place, §6).

## 3. Sécurité

### 3.1 Aucune authentification appliquée (critique)
Toutes les pages (`app/page.tsx`, `app/vehicules/page.tsx`, `app/bons/page.tsx`, `app/carburant/page.tsx`) et toutes les Server Actions font leurs requêtes avec `lib/supabaseClient.ts`, un client Supabase créé avec la clé `NEXT_PUBLIC_SUPABASE_ANON_KEY` et **sans session utilisateur**. Sans `middleware.ts` pour rediriger vers `/login`, ces pages sont accessibles à quiconque a l'URL, connecté ou non.

Conséquence directe selon l'état des policies RLS côté Supabase (à vérifier une fois les clés fournies, cf. §7) :
- si RLS est désactivé sur les tables → **toutes les données sont lisibles et modifiables publiquement** par quiconque possède la clé anonyme (qui, étant `NEXT_PUBLIC_*`, est de toute façon visible dans le bundle JS envoyé au navigateur — c'est normal pour une clé anon, mais seulement si RLS applique de vraies restrictions dessus) ;
- si RLS est activé mais que les policies exigent un rôle authentifié → l'app actuelle ne fonctionne probablement pas du tout pour l'écriture (les `insert`/`update` échoueraient silencieusement en `error`, actuellement juste transformé en exception générique).

Aucune notion de rôle/site n'est appliquée côté application : tout visiteur voit tous les sites (Garage Central, D1 Nikki, D2 Bessassi), alors que le cahier des charges (§3, §5) exige un filtrage strict par rôle et par site.

### 3.2 Aucune traçabilité fiable des actions
Les champs `utilisateur_nom` / `demandeur_nom` sont de simples champs texte libres saisis dans le formulaire (`app/vehicules/actions.ts:27`, `app/bons/actions.ts:9`, `app/carburant/actions.ts:11`), sans lien avec un compte réel. N'importe qui peut se faire passer pour n'importe quel collègue. C'est un des objectifs même du cahier des charges (mémoire fiable des bons) qui n'est pas encore atteint.

### 3.3 Aucune validation des entrées serveur
Dans les 3 fichiers `actions.ts`, les champs sont castés directement (`Number(formData.get(...))`, `as string`) sans vérification :
- `Number()` sur un champ vide/invalide donne `NaN`, qui sera envoyé tel quel à Supabase (échec probable mais mal géré, cf. 3.4) ;
- aucune limite sur les quantités (ex. quantité négative de carburant, cf. 3.5) ;
- aucun échappement/validation de format (immatriculation, dates).

### 3.4 Messages d'erreur bruts renvoyés au client
Chaque action fait `if (error) throw new Error(error.message)` (ex. `app/carburant/actions.ts:23,33,47`). En Server Action Next.js, cette erreur remonte jusqu'à l'écran d'erreur affiché au navigateur, ce qui peut exposer des détails internes (noms de colonnes/tables, contraintes SQL) à l'utilisateur final. À remplacer par une gestion d'erreur contrôlée (message générique côté UI, détail loggé côté serveur).

### 3.5 Race condition sur le solde carburant
`app/carburant/actions.ts:26-47` fait un **read-then-write** non atomique : lire `quantite_litres`, calculer la nouvelle valeur en JS, puis `update`. Si deux mouvements sont enregistrés en même temps sur le même site/type, l'un des deux peut écraser l'autre (perte de mise à jour) — problème classique de concurrence. Le calcul devrait être fait côté base (fonction SQL `increment_carburant(site_id, type, delta)` ou `update ... set quantite_litres = quantite_litres + $1`), pas en lisant puis en réécrivant depuis le serveur Next.js. Rien n'empêche non plus une consommation de faire passer le solde en négatif.

### 3.6 Clé `service_role`
Elle n'est pas encore utilisée dans le code (pas de `lib/supabaseAdminClient.ts`), donc pas de risque actuel de fuite — mais à surveiller de près quand l'espace admin sera créé : cette clé ne doit **jamais** être préfixée `NEXT_PUBLIC_` ni importée dans un composant/fichier `"use client"`.

### 3.7 Bon point : gestion des secrets
`.gitignore` exclut correctement `.env*` (ligne `# env files`), et aucun fichier `.env*` n'est présent ni commité dans l'historique (2 commits vérifiés). Aucun secret en dur trouvé dans le code source.

## 4. Qualité de code / bonnes pratiques

- **Duplication** : le même schéma (client Supabase importé directement dans la page + dans `actions.ts`, formulaire non contrôlé, table de résultats) est répété à l'identique dans `vehicules`, `bons`, `carburant`. Une fois l'auth en place, factoriser un client serveur unique (`lib/supabaseServerClient.ts`) et des helpers de formulaire réduirait la duplication.
- **Pas de validation de schéma** : aucune librairie (zod, valibot…) pour valider les `FormData` avant insertion — recommandé vu le nombre de champs numériques/dates gérés à la main.
- **`app/layout.tsx`** garde encore le titre/description par défaut de `create-next-app` (« Create Next App » / « Generated by create next app »), à personnaliser (`metadata` §1 SEO/branding).
- **`README.md`** est aussi resté celui généré par défaut — ne documente pas le projet réel (contrairement à `ARCHITECTURE.md` et `CAHIER_DES_CHARGES.md`, qui eux sont bien à jour et clairs).
- **Assets par défaut** (`public/next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`) : boilerplate `create-next-app` non utilisé, à nettoyer.
- **Style** : mélange de CSS Modules (`page.module.css`) et de styles inline (`app/page.tsx` utilise `style={{ ... }}` partout) alors que Tailwind est installé (`@tailwindcss/postcss`, `globals.css` fait `@import "tailwindcss"`) mais n'est utilisé nulle part dans les pages actuelles. À harmoniser : choisir une seule approche (Tailwind, ou CSS Modules comme indiqué dans `ARCHITECTURE.md` §2).
- **Accessibilité** : les `<select>`/`<input>` utilisent `<label>` englobant le champ (correct), bon point.

## 5. Dépendances

```
next 16.3.1 · react 19.2.8 · react-dom 19.2.8
@supabase/supabase-js ^2.112.3
tailwindcss ^4 · eslint ^9 · typescript ^5
```
- `node_modules` n'est pas installé dans l'environnement actuel (`npm install` n'a pas encore été lancé ici) — donc ni `npm run lint`, ni `npm run build`, ni `next dev` n'ont pu être exécutés pour cet audit statique.
- Le projet utilise une version de Next.js avec des changements par rapport à la version standard documentée dans les modèles d'entraînement (cf. `AGENTS.md` à la racine) — **avant toute modification de code**, consulter `node_modules/next/dist/docs/` une fois les dépendances installées, en particulier tout ce qui touche aux Server Actions et au middleware, avant d'implémenter l'authentification.

## 6. Tests / CI / Déploiement

- Aucun test (unitaire, intégration, e2e) dans le dépôt.
- Aucune CI (pas de `.github/workflows`, pas d'autre config CI trouvée).
- Hébergement prévu sur Vercel mais pas encore configuré (cohérent avec le cahier des charges §6, qui indique que l'hébergement reste à définir avec le client).

## 7. Variables d'environnement

Aucun fichier `.env.local` n'est présent dans le projet au moment de cet audit. D'après `ARCHITECTURE.md` §7, 3 variables sont attendues :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Quand tu enverras ces clés**, voici ce que je vérifierai concrètement (à faire suivre dans le chat, ou en créant `.env.local` toi-même localement) :
1. Que l'URL/clé anonyme permettent bien à `npm run dev` de démarrer et que `/` (Stock) charge des données sans erreur.
2. L'état réel des policies RLS sur chaque table (`sites`, `pieces`, `stocks`, `vehicules`, `pieces_utilisees`, `demandes_pieces`, `carburant_stock`, `mouvements_carburant`, `utilisateurs`) — pour confirmer/infirmer le point critique du §3.1 (accès public en écriture tant qu'il n'y a pas d'auth).
3. Que `SUPABASE_SERVICE_ROLE_KEY` n'est utilisée nulle part côté client une fois l'admin implémenté.

⚠️ Ne mets jamais `SUPABASE_SERVICE_ROLE_KEY` dans un message ou fichier qui pourrait être commité/partagé ailleurs que `.env.local` (qui est bien ignoré par git, cf. §3.7) — c'est la clé qui contourne toutes les policies RLS.

## 7bis. Vérification RLS effectuée (2026-08-23)

`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` ont été fournis et testés en conditions réelles (`.env.local` créé localement, non commité). `SUPABASE_SERVICE_ROLE_KEY` n'a pas été fourni — sans impact puisqu'aucun code ne l'utilise encore.

**Test 1 — lecture (`SELECT`) sur toutes les tables, sans authentification :**

| Table | Résultat |
|---|---|
| `sites`, `roles`, `types_vehicules`, `pieces` | ✅ lisible publiquement (catalogue, attendu) |
| `stocks`, `vehicules`, `pieces_utilisees`, `demandes_pieces`, `carburant_stock`, `mouvements_carburant` | ✅ lisible publiquement, actuellement 0 ligne dans chacune |
| **`utilisateurs`** | ⚠️ **lisible publiquement**, contient déjà un compte réel avec un **email** (`graciamehome@gmail.com`) |

➡️ **Confirmé : aucune RLS de lecture n'est active.** N'importe qui possédant la clé anonyme (publique par nature, visible dans le JS envoyé au navigateur dès que le site est en ligne) peut lire l'intégralité des données de toutes les tables, y compris la table `utilisateurs` avec les emails des comptes. C'est une **fuite de données personnelles** dès la mise en ligne, même avant tout ajout de données métier sensibles.

**Test 2 — écriture (`INSERT`) sans authentification, avec nettoyage immédiat des lignes de test :**

| Table | Résultat |
|---|---|
| `sites` | 🔒 bloqué par RLS |
| `demandes_pieces` | 🔒 bloqué par RLS |
| `vehicules` | 🔒 bloqué par RLS |
| `mouvements_carburant` | 🔒 bloqué par RLS |
| `utilisateurs` | 🔒 bloqué par RLS |
| **`pieces_utilisees`** | ⚠️ **insertion autorisée**, aucune policy RLS ne la protège |

➡️ Conséquence concrète sur l'app actuelle (sans authentification) :
- Le formulaire **« Arrivée véhicule »** (`app/vehicules/actions.ts` → `ajouterVehicule`) est **cassé** aujourd'hui : la RLS bloque l'insert sur `vehicules`, l'action lève une erreur (§3.4) et Next affiche un écran d'erreur.
- Le formulaire **« Registre des bons »** (`app/bons/actions.ts` → `ajouterDemande`) est **cassé** pour la même raison sur `demandes_pieces`.
- Le formulaire **« Carburant »** (`app/carburant/actions.ts`) est **cassé** sur `mouvements_carburant`.
- Le formulaire **« Pièces utilisées »** (`app/vehicules/actions.ts` → `ajouterUtilisation`) est le **seul qui fonctionne** actuellement, car `pieces_utilisees` n'a aucune protection RLS en écriture — donc n'importe qui peut aussi y insérer des lignes arbitraires, sans lien avec un véhicule ou une pièce réels.

**Conclusion** : ce n'est pas encore fonctionnel de bout en bout, et ce qui « semble » avoir été testé avec succès se limite probablement à la lecture (§ Test 1) et à l'enregistrement de pièces utilisées. Les policies RLS actuelles sont incohérentes (protègent l'écriture sur 4 tables sur 5 testées, mais aucune lecture) — ce n'est pas un état stable de sécurité, plutôt une configuration partielle/en cours. À traiter dans le même chantier que l'authentification (§8, point 1) : définir les policies RLS définitives par rôle/site pour **chaque** table (lecture ET écriture), pas seulement quelques-unes.

## 7ter. Hébergement — clarification du client

Le client a confirmé ne pas disposer de serveur interne ; la question d'hébergement soulevée au §6 du cahier des charges est donc tranchée : **c'est à l'équipe projet de choisir et gérer l'hébergement** (Vercel, prévu dans `ARCHITECTURE.md` §2, reste le choix par défaut). Cela ne lève pas la réserve sur la sensibilité des données réelles — cf. §7bis, la fuite de lecture publique doit être corrigée avant toute saisie de données opérationnelles réelles, indépendamment de l'hébergement choisi.

## 8. Priorités recommandées

1. **Bloquant, urgent** : couper l'accès public en lecture (SELECT) sur toutes les tables, en particulier `utilisateurs` (emails exposés dès maintenant). Ne pas attendre l'implémentation complète de l'auth pour ce point — une policy RLS minimale (`deny by default` puis règles par rôle) doit être posée rapidement.
2. **Bloquant avant toute donnée réelle** : implémenter l'authentification (`login`, `middleware.ts`, `supabaseServerClient.ts`) et faire respecter des RLS cohérentes par rôle/site sur **toutes** les tables (lecture + écriture) — condition explicite du cahier des charges (§6) et confirmée par les tests du §7bis.
3. Revoir la policy RLS de `pieces_utilisees` (actuellement ouverte en écriture sans aucune restriction).
4. Remplacer le read-then-write du solde carburant (§3.5) par une opération atomique côté base.
5. Ajouter une validation de schéma des `FormData` dans les 3 `actions.ts` existants.
6. Nettoyer les traces `create-next-app` (README, metadata, assets `public/`) une fois le reste stabilisé — cosmétique, non bloquant.
7. Une fois l'auth en place, remplacer les champs texte libres `*_nom` par l'identité de l'utilisateur connecté (`getUtilisateurConnecte()`, comme prévu dans `ARCHITECTURE.md`).
