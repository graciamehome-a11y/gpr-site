# Cahier des charges — Site de Gestion des Pièces & Réparations (GPR)

## 1. Contexte

Le service de réparation automobile gère l'acheminement des pièces de rechange entre plusieurs sites (Garage Central, détachements D1 Nikki et D2 Bessassi, Comptable Matières), ainsi que le suivi des véhicules en réparation et du carburant des détachements. Le processus actuel repose sur des échanges oraux, des déplacements physiques et des bons papier, sans visibilité partagée entre les acteurs.

## 2. Objectifs du site

- Permettre à chaque acteur de consulter en temps réel les informations qui le concernent (stock, véhicules, bons, carburant).
- Réduire les déplacements physiques uniquement destinés à transmettre une information.
- Assurer la continuité du travail entre techniciens grâce à un historique consultable par véhicule.
- Conserver une mémoire numérique des bons de demande, en sécurité contre la perte de documents papier.
- Faciliter les points financiers périodiques (mensuels/trimestriels) grâce à des données déjà centralisées.

## 3. Acteurs et rôles

| Rôle | Rattachement | Visibilité |
|---|---|---|
| Technicien | D1 Nikki, D2 Bessassi, ou Garage Central | Son site uniquement |
| Chef de détachement | D1 Nikki ou D2 Bessassi | Son détachement uniquement |
| Chef Garage | Garage Central | Tous les sites (pièces, véhicules, bons) |
| Comptable Matières | Réserve Comptable Matières | Tous les sites (pièces, véhicules, bons) |
| Chef Service Technique | — (vue globale) | Tous les sites, y compris le carburant des deux détachements |

## 4. Périmètre fonctionnel

### 4.1 Gestion du stock de pièces
- Catalogue des pièces, organisé par type de véhicule (marque/modèle).
- Quantité disponible par site, avec seuil d'alerte.
- Ajout/mise à jour des quantités par les rôles autorisés.

### 4.2 Gestion des véhicules
- Enregistrement de l'arrivée d'un véhicule (immatriculation, type, site).
- Historique des pièces utilisées lors d'une réparation, avec date.
- Statut du véhicule (arrivé, en réparation, transféré, prêt).

### 4.3 Registre des bons
- Enregistrement d'une demande de pièce : demandeur, site, véhicule, pièce, quantité, date.
- Statut du bon (en attente, validé, refusé, livré), modifiable par la suite.
- Pas de circuit de validation à plusieurs niveaux dans le site : le bon papier reste la référence officielle pour les signatures hiérarchiques ; le site sert de mémoire numérique complémentaire.

### 4.4 Gestion du carburant
- Suivi du gasoil et de l'essence, uniquement pour les détachements (D1 Nikki, D2 Bessassi).
- Solde global par détachement (non détaillé par véhicule).
- Enregistrement des ravitaillements et consommations par les techniciens eux-mêmes.

### 4.5 Comptes et authentification
- Connexion par email et mot de passe.
- Création des comptes réservée aux rôles à vue globale (Chef Garage, Comptable Matières, Chef Service Technique).
- Accès aux données strictement filtré selon le rôle et le site de la personne connectée.

## 5. Règles de gestion particulières

- Le carburant n'est ni fourni ni suivi par le Garage Central ou le Comptable Matières.
- Un véhicule est unique et localisé à un seul site à la fois ; son type (marque/modèle) est distinct de sa localisation.
- Une pièce peut être commune à plusieurs types de véhicules (ex. filtres, batteries) ou spécifique à un seul.
- Les lubrifiants et consommables génériques ne sont pas rattachés à un type de véhicule précis.

## 6. Exigences non fonctionnelles

- Interface entièrement en français.
- Hébergement à définir avec le client (le service ne dispose pas de serveur interne à ce jour) ; la sensibilité des données réelles (dotations par unité, quantités opérationnelles) doit être validée par la hiérarchie avant toute saisie en conditions réelles.
- Site pensé pour un usage sur ordinateur et mobile (interface adaptable), avec une évolution possible vers une PWA (installable, notifications) en phase 2.

## 7. Hors périmètre (phase actuelle)

- Application mobile native.
- Circuit de validation hiérarchique numérique multi-niveaux pour les bons.
- Détail de consommation de carburant par véhicule (solde global uniquement pour l'instant).
- Fonctionnement hors ligne complet (prévu en phase PWA ultérieure).

## 8. Livrables

- Site web fonctionnel (Next.js, base de données Supabase).
- Documentation d'architecture technique.
- Comptes de démonstration pour validation avant mise en service réelle.

## 9. Planning indicatif

Développement estimé entre 20 et 25 jours, sous réserve de stabilité du périmètre fonctionnel décrit ci-dessus.
