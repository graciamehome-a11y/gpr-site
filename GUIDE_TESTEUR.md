# Guide testeur — GPR

Tout ce qu'il faut pour tester l'application, en local ou en production.

## État au 21 septembre 2026 — à jour et vérifié en production

- **URL de production** : **https://garage-gracia.vercel.app** — déployée
  (commit `3981d65`), vérifiée par 39 tests automatisés + 9 tests du parcours
  de création de compte
- Code sur GitHub, branches `main` et `srk-work`
- RLS appliquées et vérifiées en production
- **Migration du 21/09 appliquée** en base : journal des mouvements de stock,
  décrément automatique, transferts entre sites, correction de la faille sur le
  carburant (`supabase/migrations/20260921000001_securite_et_mouvements_stock.sql`)
- Détail des corrections et de l'audit : **`AUDIT-2026-09-21.md`**

### Déployer une modification

**L'intégration Git n'est pas connectée** : pousser sur GitHub ne déclenche
aucun déploiement. En attendant qu'elle soit rétablie (voir
`AUDIT-2026-09-21.md` §8), chaque mise en production se fait à la main :

```bash
npx vercel --prod
```

Puis vérifier :

```bash
URL_APP=https://garage-gracia.vercel.app node scripts/tester-app.mjs
URL_APP=https://garage-gracia.vercel.app node scripts/tester-creation-compte.mjs
```

## Comptes de test

| Email | Rôle | Mot de passe |
|---|---|---|
| `technicien@test.local` | Technicien (D1 Nikki) | `Test1234!` |
| `chef.detachement@test.local` | Chef de détachement (D2 Bessassi) | `Test1234!` |
| `chef.garage@test.local` | Chef Garage | `Test1234!` |
| `comptable.matieres@test.local` | Comptable Matières | `Test1234!` |
| `chef.technique@test.local` | Chef Service Technique | `Test1234!` |

Ces comptes sont des comptes de démonstration : ils ne doivent pas servir en
exploitation réelle.

## Créer un compte pour une vraie personne

1. Se connecter avec un rôle à vue globale (Chef Garage, Comptable Matières ou
   Chef Service Technique).
2. Ouvrir **Comptes**, remplir prénom / nom / email / rôle / site.
3. **Le mot de passe temporaire s'affiche une seule fois.** Le noter et le
   transmettre à la personne — de vive voix, ou par un moyen qu'elle seule
   recevra.
4. La personne se connecte avec ce mot de passe, puis le change depuis
   **Mon mot de passe** (icône clé, en haut à droite).

Aucun email n'est envoyé : le compte est utilisable immédiatement. C'est
volontaire — l'envoi d'emails de ce projet est plafonné à **2 par heure** et ne
touche pas les adresses externes (voir `AUDIT-2026-09-21.md` §1).

**Quelqu'un est bloqué ?** Le bouton **Réinitialiser le mot de passe** sur sa
ligne dans la page Comptes lui en génère un nouveau. La page signale aussi les
comptes qui ne se sont **jamais connectés**.

## 1. Où tester

| Environnement | URL | Base de données |
|---|---|---|
| **Production** | https://garage-gracia.vercel.app | Base cloud Supabase |
| Local (`npm run dev`) | http://localhost:3000 | Stack Docker local — **à démarrer** (`supabase start`) |
| Local (build de prod) | http://localhost:3100 | Base cloud, si `.env.development.local` est retiré |

⚠️ `.env.development.local` est prioritaire sur `.env.local` en développement : il
pointe vers le stack local. Si celui-ci n'est pas démarré, `npm run dev` échoue
en `ECONNREFUSED`. Pour tester contre la vraie base en local, retirez ce fichier.

## 2. Ce que chaque rôle doit voir

| Rôle | Doit voir |
|---|---|
| Technicien | Uniquement D1 Nikki |
| Chef de détachement | Uniquement D2 Bessassi |
| Chef Garage | Tous les sites, **pas** le carburant |
| Comptable Matières | Tous les sites, **pas** le carburant |
| Chef Service Technique | Tous les sites + carburant des 2 détachements |

## 3. Scénarios à tester

### Authentification

- [ ] `/` sans connexion → redirige vers `/login`
- [ ] Mauvais mot de passe → message clair, aucun détail technique
- [ ] Connexion réussie → redirige vers la page demandée
- [ ] Déconnexion → retour à `/login`, `/` redevient inaccessible
- [ ] **Créer un compte depuis Comptes → le mot de passe temporaire s'affiche
      → se déconnecter → se connecter avec ce mot de passe, sans aucun email**
- [ ] **Réinitialiser le mot de passe d'un compte existant → le nouveau
      fonctionne**
- [ ] **Mon mot de passe (icône clé) → changer son mot de passe → se
      reconnecter avec**
- [ ] « Mot de passe oublié ? » → la page explique la démarche (contacter un
      responsable), **sans demander d'adresse email**
- [ ] Un lien `/auth/confirm` sans jeton → retour à `/login` avec un message
      expliquant que le lien est inutilisable

### Stock — le point le plus important

- [ ] `/stock` affiche une **liste de sites**, pas un grand tableau
- [ ] Cliquer sur un site → son stock détaillé, avec seuils, alertes et
      historique des mouvements
- [ ] Le catalogue complet est consultable sous « Tout le catalogue »
- [ ] Saisir une quantité → elle remplace la précédente, et une ligne
      apparaît dans « Derniers mouvements »
- [ ] **Envoyer du stock vers un autre site → la quantité baisse à la source,
      monte à la destination, et les 2 mouvements apparaissent**
- [ ] **Aller dans Véhicules, déclarer une pièce utilisée → revenir dans Stock :
      la quantité a baissé du même nombre**
- [ ] Déclarer plus de pièces qu'il n'y en a → la quantité passe en négatif,
      affichée en rouge « à corriger ». **Rien n'est bloqué.**
- [ ] Connecté en technicien : `/stock` ne montre que D1 Nikki ; taper l'URL
      d'un autre site renvoie une 404

### Permissions

- [ ] `technicien@test.local` : Stock, Véhicules et Bons ne montrent que D1 Nikki
- [ ] `chef.garage@test.local` : tous les sites, mais pas de lien Carburant — et
      `/carburant` tapé à la main explique que le module ne le concerne pas
- [ ] `chef.technique@test.local` : carburant des deux détachements
- [ ] « Comptes » n'apparaît que pour les rôles à vue globale ; un technicien
      qui tape `/admin/comptes` est redirigé

### Bons, Véhicules, Carburant

- [ ] **Bons** : le véhicule se choisit par immatriculation réelle, avec son
      type ; le site n'est plus demandé (il découle du véhicule)
- [ ] Bons : changer le statut en un tap
- [ ] Véhicules : arrivée, puis statuts Arrivé → En réparation → Transféré → Prêt
- [ ] Carburant : ravitaillement → le solde monte ; consommation → il baisse
- [ ] Une pièce répétée (« Amortisseur AR ») affiche bien **son** véhicule, et
      taper « masstech » dans le champ la trouve

### Mobile / PWA

- [ ] Sur téléphone : barre de navigation en bas, avec icônes
- [ ] Champ « Pièce » : taper 2-3 lettres filtre la liste
- [ ] Le dernier choix réapparaît en raccourci au formulaire suivant
- [ ] **Se déconnecter, puis rouvrir hors ligne : les écrans de la personne
      précédente ne doivent plus s'afficher**

## 4. Scripts de vérification

À lancer depuis la racine du projet :

| Commande | Ce qu'elle vérifie |
|---|---|
| `node scripts/verifier-migration.mjs` | La migration est bien appliquée en base |
| `node scripts/tester-migration.mjs` | 29 tests des fonctions de stock — **dans une transaction annulée**, rien n'est modifié |
| `node scripts/tester-app.mjs` | 39 tests : pages, permissions, explications, signatures des fonctions. Sans `URL_APP`, teste le port 3100 ; avec `URL_APP=https://…`, teste la production |
| `node scripts/tester-creation-compte.mjs` | 9 tests du parcours complet : créer un compte, se connecter aussitôt, changer son mot de passe |
| `node scripts/diagnostic-securite.mjs` | La faille du carburant est bien fermée |
| `node scripts/diagnostic-schema.mjs` | Colonnes et fonctions réellement présentes en base |

Les scripts qui créent des données (tests de compte) **nettoient derrière eux**,
même en cas d'erreur.

`tester-migration.mjs` et `verifier-migration.mjs` ont besoin d'un jeton
d'accès Supabase dans `SUPABASE_ACCESS_TOKEN` (jamais à écrire dans un fichier
du dépôt).

## 5. Ce qui n'est PAS encore couvert

- **Aucun email n'est envoyé** — c'est un choix assumé pour l'instant. La
  création de compte se fait par mot de passe temporaire, et la récupération
  d'accès passe par un responsable. La page « Mot de passe oublié » explique
  cette démarche au lieu de promettre un email. Voir `AUDIT-2026-09-21.md` §1
  pour activer l'envoi plus tard (Resend ou Brevo).
- Pas d'historique des modifications de véhicules ou de bons (seul le stock a
  son journal).
- Marquer un bon « Livré » ne décrémente pas le stock : seuls « Pièce utilisée »
  et les envois entre sites le font.
- Pas de tests automatisés dans une CI (les scripts ci-dessus s'exécutent à la
  demande).
