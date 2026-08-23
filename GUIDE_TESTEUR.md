# Guide testeur — GPR

Ce document donne tout ce qu'il faut pour tester l'application, en local ou en production. Basé sur des recherches de bonnes pratiques (checklist production Supabase — voir sources en bas).

## ✅ État au 2026-08-23 — déployé

- **URL de production** : **https://garage-gracia.vercel.app**
- Code poussé sur GitHub, branche `srk-work` : https://github.com/graciamehome-a11y/gpr-site/tree/srk-work
- Correctif RLS **appliqué et vérifié en production** (fuite de lecture publique fermée — confirmé par un test direct après application, voir `AUDIT.md` §0bis)

## Comptes de test — disponibles en production

Les 5 comptes de test existent maintenant sur la vraie base de production (créés avec ton accord, mot de passe unique) :

| Email | Rôle |
|---|---|
| `technicien@test.local` | Technicien (D1 Nikki) |
| `chef.detachement@test.local` | Chef de détachement (D2 Bessassi) |
| `chef.garage@test.local` | Chef Garage |
| `comptable.matieres@test.local` | Comptable Matières |
| `chef.technique@test.local` | Chef Service Technique |

**Mot de passe pour les 5 : `Test1234!`**

Connexion vérifiée en direct contre la prod (voir §0bis de `AUDIT.md`) : connexion OK, lecture des données OK une fois connecté, toujours bloquée pour un visiteur anonyme.

## 1. Où tester

| Environnement | URL | Base de données |
|---|---|---|
| **Production** | https://garage-gracia.vercel.app | Vraie base cloud Supabase |
| Local (`npm run dev`) | http://localhost:3000 | Stack Docker local (données de test uniquement) |
| Local (Docker) | http://localhost:3001 | Idem |

Les mêmes 5 comptes (§ ci-dessus) fonctionnent partout. Ce que chaque rôle doit voir :

| Rôle | Doit voir |
|---|---|
| Technicien | Uniquement D1 Nikki |
| Chef de détachement | Uniquement D2 Bessassi |
| Chef Garage | Tous les sites, PAS le carburant |
| Comptable Matières | Tous les sites, PAS le carburant |
| Chef Service Technique | Tous les sites + carburant des 2 détachements |

## 2. Scénarios à tester (checklist)

### Authentification
- [ ] Accès à `/` sans connexion → redirige vers `/login`
- [ ] Mauvais mot de passe → message d'erreur clair, pas de détail technique exposé
- [ ] Connexion réussie → redirige vers la page demandée initialement
- [ ] Déconnexion (bouton « Quitter ») → retour à `/login`, `/` redevient inaccessible

### Permissions par rôle (le plus important)
- [ ] Connecté en `technicien@test.local` : le Stock, les Véhicules et les Bons n'affichent que D1 Nikki
- [ ] Connecté en `chef.garage@test.local` : voit tous les sites, mais le lien Carburant n'apparaît pas dans la navigation
- [ ] Connecté en `chef.technique@test.local` : voit le carburant des deux détachements
- [ ] Le lien « Comptes » (`/admin/comptes`) n'apparaît que pour Chef Garage / Comptable Matières / Chef Service Technique
- [ ] Un technicien qui tape directement `/admin/comptes` dans l'URL est bien redirigé (pas juste caché dans le menu)

### Modules fonctionnels
- [ ] **Stock** : ajouter une quantité pour une pièce/site, vérifier qu'elle apparaît et que le seuil d'alerte surligne en rouge si atteint
- [ ] **Véhicules** : enregistrer une arrivée, changer son statut en tapant directement sur les boutons (Arrivé → En réparation → Transféré → Prêt), enregistrer une pièce utilisée
- [ ] **Bons** : créer une demande, changer son statut en un tap
- [ ] **Carburant** : enregistrer un ravitaillement, vérifier que le solde affiché augmente ; enregistrer une consommation, vérifier qu'il diminue

### UX mobile
- [ ] Ouvrir sur un téléphone (ou réduire la fenêtre du navigateur) : la barre de navigation passe en bas de l'écran avec des icônes
- [ ] Champ « Pièce » : taper 2-3 lettres, vérifier que la liste se filtre sans scroller un long menu
- [ ] Après avoir choisi une pièce une fois, elle réapparaît en raccourci (chip) juste en dessous au prochain passage sur ce formulaire

### Page d'aide
- [ ] Cliquer sur le `?` en haut à droite → `/e` s'affiche avec un résumé adapté au rôle connecté

## 3. Ce qui n'est PAS encore couvert (à ne pas signaler comme bug)

- Pas de récupération de mot de passe oublié (« mot de passe oublié ») — pas encore implémenté.
- Pas de validation de schéma poussée sur les formulaires (ex. quantité négative bloquée côté UI mais pas forcément avec un message explicite).
- Le module Stock affiche les quantités mais pas encore d'historique des modifications.
- La base de production est actuellement presque vide (`stocks`, `vehicules`, `demandes_pieces`, `carburant_stock` n'ont aucune ligne) — normal, aucune donnée réelle n'a encore été saisie (cf. cahier des charges §6, qui interdit la saisie de données réelles avant validation de l'hébergement par le client).

## 4. Variables d'environnement — état sur Vercel (projet `garage-gracia`)

| Variable | Statut |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ définie |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ définie |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ définie — `/admin/comptes` fonctionnel en prod |

## Sources (bonnes pratiques utilisées pour ce guide)

- [Supabase — Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase RLS Best Practices — makerkit.dev](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Bastion — Supabase Security Best Practices for Production Apps](https://bastion.tech/blog/supabase-security-best-practices/)
