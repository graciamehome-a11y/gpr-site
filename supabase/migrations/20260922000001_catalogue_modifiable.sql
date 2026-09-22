-- ============================================================================
-- GPR — Migration du 2026-09-22
--
-- Rend le CATALOGUE modifiable depuis l'application : types de véhicules et
-- pièces.
--
-- Pourquoi c'est nécessaire : `types_vehicules` et `pieces` n'avaient qu'une
-- policy de LECTURE. Le catalogue ne pouvait donc être rempli qu'en intervenant
-- directement dans Supabase. Or `vehicules.type_vehicule_id` est obligatoire :
-- sans types de véhicules, plus aucun véhicule ne peut être enregistré, et
-- l'application devient inutilisable. Une remise à zéro complète exige donc de
-- pouvoir tout ressaisir depuis l'écran.
--
-- Idempotent : peut être rejoué sans risque.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Types de véhicules
--    Réservé aux rôles à vue globale : c'est un référentiel partagé par tous
--    les sites, il ne doit pas être modifié à la légère depuis un détachement.
-- ---------------------------------------------------------------------------
drop policy if exists "creation_types_vehicules" on types_vehicules;
create policy "creation_types_vehicules" on types_vehicules
  for insert to authenticated
  with check (coalesce(est_vue_globale(), false));

drop policy if exists "maj_types_vehicules" on types_vehicules;
create policy "maj_types_vehicules" on types_vehicules
  for update to authenticated
  using (coalesce(est_vue_globale(), false))
  with check (coalesce(est_vue_globale(), false));

-- La suppression est refusée si un véhicule ou une pièce y fait encore
-- référence : la clé étrangère s'en charge, et l'application traduit l'erreur
-- en message compréhensible plutôt que d'afficher une panne.
drop policy if exists "suppression_types_vehicules" on types_vehicules;
create policy "suppression_types_vehicules" on types_vehicules
  for delete to authenticated
  using (coalesce(est_vue_globale(), false));

-- ---------------------------------------------------------------------------
-- 2. Pièces
-- ---------------------------------------------------------------------------
drop policy if exists "creation_pieces" on pieces;
create policy "creation_pieces" on pieces
  for insert to authenticated
  with check (coalesce(est_vue_globale(), false));

drop policy if exists "maj_pieces" on pieces;
create policy "maj_pieces" on pieces
  for update to authenticated
  using (coalesce(est_vue_globale(), false))
  with check (coalesce(est_vue_globale(), false));

drop policy if exists "suppression_pieces" on pieces;
create policy "suppression_pieces" on pieces
  for delete to authenticated
  using (coalesce(est_vue_globale(), false));

-- ---------------------------------------------------------------------------
-- 3. Unicité du catalogue
--    Deux pièces de même nom pour le même véhicule n'ont pas de sens, et c'est
--    exactement la confusion que le client a signalée (« Amortisseur AR »
--    existe en CSK et en LAND-CRUISER : c'est légitime, mais pas deux fois en
--    CSK). Un index unique partiel le garantit côté base, sans bloquer les
--    pièces génériques (type_vehicule_id nul), dont le nom peut se répéter.
-- ---------------------------------------------------------------------------
create unique index if not exists idx_pieces_nom_type_unique
  on pieces (lower(btrim(nom)), type_vehicule_id)
  where type_vehicule_id is not null;

create unique index if not exists idx_pieces_nom_generique_unique
  on pieces (lower(btrim(nom)))
  where type_vehicule_id is null;

create unique index if not exists idx_types_vehicules_nom_unique
  on types_vehicules (lower(btrim(nom)));
