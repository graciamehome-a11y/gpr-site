-- ============================================================================
-- GPR — Migration du 2026-09-21
--
-- 1. Ferme la faille du garde-fou de `ajuster_carburant_stock`
-- 2. Ajoute le journal des mouvements de stock
-- 3. Ajoute les fonctions atomiques : consommation, transfert, ajustement
-- 4. Rend atomique l'enregistrement d'un mouvement de carburant
-- 5. Referme l'exécution des fonctions pour le rôle `anon`
--
-- Idempotent : peut être rejoué sans risque.
-- À exécuter dans : Dashboard Supabase > SQL Editor > New query > Run
-- ============================================================================


-- ============================================================================
-- 1. GARDE-FOUS — le piège du NULL
--
-- La version précédente écrivait :
--     if not (mon_role() = 'chef_service_technique' or …) then raise …
-- Or `mon_role()` vaut NULL dès que la personne n'a pas de ligne dans
-- `utilisateurs` — c'est le cas d'un visiteur anonyme, et celui d'un compte
-- auto-inscrit. En SQL, `NULL = 'x'` vaut NULL, donc `NOT (NULL)` vaut NULL,
-- et un `IF NULL` n'exécute pas la branche : le garde-fou ne se déclenchait
-- JAMAIS. Un appelant sans session pouvait donc modifier le solde de carburant
-- de n'importe quel site (vérifié en production lors de l'audit du 21/09/2026).
--
-- Tous les garde-fous ci-dessous renvoient désormais un booléen strict
-- (jamais NULL) : les comparaisons sont enveloppées dans un `is not null` et le
-- résultat est passé par `coalesce(…, false)`.
-- ============================================================================

-- Vrai uniquement pour les rôles à vue globale, et jamais NULL.
create or replace function est_vue_globale()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select r.nom in ('chef_garage', 'comptable_matieres', 'chef_service_technique')
      from utilisateurs u
      join roles r on r.id = u.role_id
      where u.auth_id = auth.uid()
    ),
    false
  )
$$;

-- Vrai si la personne connectée peut écrire le stock du site demandé.
-- Ne renvoie jamais NULL : un compte sans rôle, ou sans site, obtient `false`.
create or replace function peut_ecrire_stock(p_site_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(est_vue_globale(), false)
      or (
        mon_site() is not null
        and p_site_id is not null
        and p_site_id = mon_site()
      )
$$;

-- Vrai si la personne connectée peut agir sur le carburant du site demandé.
-- Règle inchangée (cahier des charges §5) : Chef Service Technique partout,
-- technicien et chef de détachement sur leur seul site. Garage Central et
-- Comptable Matières en sont exclus.
create or replace function peut_ecrire_carburant(p_site_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    mon_role() = 'chef_service_technique'
    or (
      mon_role() in ('technicien', 'chef_detachement')
      and mon_site() is not null
      and p_site_id = mon_site()
    ),
    false
  )
$$;

-- Rejette les quantités inutilisables, en un seul endroit.
--
-- Piège PostgreSQL : `NaN <= 0` est FAUX et `NaN > 0` est VRAI (contrairement
-- à la norme IEEE 754). Une validation naïve `if q <= 0 then raise` laisse donc
-- passer NaN, et `quantite + NaN` corrompt le solde définitivement — sans
-- qu'aucune erreur ne soit jamais levée. On teste donc NaN nommément.
create or replace function verifier_quantite(p_quantite numeric, p_libelle text default 'Quantité')
returns void
language plpgsql
immutable
as $$
begin
  if p_quantite is null
     or p_quantite = 'NaN'::numeric
     or p_quantite = 'Infinity'::numeric
     or p_quantite = '-Infinity'::numeric
     or p_quantite <= 0 then
    raise exception '% invalide (reçue : %)', p_libelle, coalesce(p_quantite::text, 'null')
      using errcode = '22023';
  end if;
end;
$$;

-- Idem, mais pour une quantité qui a le droit d'être nulle (correction à 0).
create or replace function verifier_quantite_finie(p_quantite numeric, p_libelle text default 'Quantité')
returns void
language plpgsql
immutable
as $$
begin
  if p_quantite is null
     or p_quantite = 'NaN'::numeric
     or p_quantite = 'Infinity'::numeric
     or p_quantite = '-Infinity'::numeric then
    raise exception '% invalide (reçue : %)', p_libelle, coalesce(p_quantite::text, 'null')
      using errcode = '22023';
  end if;
end;
$$;


-- ============================================================================
-- 2. CORRECTIF de `ajuster_carburant_stock`
--    (garde-fou NULL + course « update ; if not found then insert »)
-- ============================================================================

create or replace function ajuster_carburant_stock(p_site_id bigint, p_type text, p_delta numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_site_id is null then
    raise exception 'Site manquant' using errcode = '22023';
  end if;
  if p_type is null or p_type not in ('gasoil', 'essence') then
    raise exception 'Type de carburant invalide (reçu : %)', coalesce(p_type, 'null')
      using errcode = '22023';
  end if;
  perform verifier_quantite_finie(p_delta, 'Variation de carburant');

  if not peut_ecrire_carburant(p_site_id) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  -- `on conflict` remplace l'ancien « update puis, si rien n'a été trouvé,
  -- insert » : deux appels simultanés sur une ligne absente faisaient tous deux
  -- échouer l'update puis tous deux tenter l'insert, et l'un des deux recevait
  -- une violation d'unicité.
  --
  -- La branche insert utilise `p_delta` tel quel : une consommation sur un site
  -- jamais approvisionné fait descendre le solde sous zéro, au lieu d'être
  -- silencieusement ramenée à zéro comme avant. Le solde négatif est visible à
  -- l'écran, donc corrigeable — c'est la même règle que pour les pièces.
  insert into carburant_stock (site_id, type, quantite_litres)
  values (p_site_id, p_type, p_delta)
  on conflict (site_id, type)
    do update set quantite_litres = carburant_stock.quantite_litres + p_delta;
end;
$$;


-- ============================================================================
-- 3. JOURNAL DES MOUVEMENTS DE STOCK
--
-- Il répond à « pourquoi la quantité a-t-elle changé ? ». Le site et la
-- quantité d'après sont figés au moment du mouvement : c'est la photographie
-- correcte, même si le véhicule change de site plus tard.
-- ============================================================================

create table if not exists mouvements_stock (
  id bigint generated by default as identity primary key,
  piece_id bigint not null references pieces(id),
  site_id bigint not null references sites(id),
  type text not null check (
    type in ('consommation', 'transfert_sortie', 'transfert_entree', 'correction')
  ),
  -- Toujours positif : c'est `type` qui donne le sens du mouvement.
  -- `<> 'NaN'` est nécessaire : en PostgreSQL NaN = NaN est vrai, donc cette
  -- comparaison écarte bien NaN (là où `quantite > 0` le laisserait passer).
  quantite numeric not null check (quantite > 0 and quantite <> 'NaN'::numeric),
  quantite_apres numeric not null,
  vehicule_id bigint references vehicules(id),
  site_origine_id bigint references sites(id),
  utilisateur_id bigint references utilisateurs(id),
  utilisateur_nom text,
  motif text,
  date_mouvement timestamptz not null default now()
);

create index if not exists idx_mouvements_stock_site_date
  on mouvements_stock (site_id, date_mouvement desc);
create index if not exists idx_mouvements_stock_piece_site
  on mouvements_stock (piece_id, site_id, date_mouvement desc);

alter table mouvements_stock enable row level security;

drop policy if exists "lecture_mouvements_stock" on mouvements_stock;
create policy "lecture_mouvements_stock" on mouvements_stock
  for select to authenticated
  using (
    coalesce(est_vue_globale(), false)
    or (
      mon_site() is not null
      and site_id = mon_site()
    )
  );

-- Aucune policy d'insertion / modification / suppression : le journal n'est
-- alimenté que par les fonctions SECURITY DEFINER ci-dessous. Personne ne peut
-- donc le falsifier ni l'effacer depuis l'application.
grant select on mouvements_stock to authenticated;
revoke insert, update, delete on mouvements_stock from authenticated, anon;


-- ============================================================================
-- 4. FONCTIONS ATOMIQUES DE STOCK
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 Consommation : « pièce utilisée » sur un véhicule en réparation.
--     Insère l'historique, décrémente le stock du site du véhicule et journalise,
--     le tout dans une seule transaction. Aucune lecture-puis-écriture côté
--     application, donc aucune perte de mise à jour possible.
-- ---------------------------------------------------------------------------
create or replace function enregistrer_utilisation(
  p_vehicule_id bigint,
  p_piece_id bigint,
  p_quantite numeric,
  p_date date,
  p_utilisateur_nom text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id bigint;
  v_apres numeric;
begin
  perform verifier_quantite(p_quantite);

  select v.site_id into v_site_id from vehicules v where v.id = p_vehicule_id;
  if v_site_id is null then
    raise exception 'Véhicule inconnu (id %)', p_vehicule_id using errcode = '23503';
  end if;

  if not (
    coalesce(est_vue_globale(), false)
    or (
      mon_site() is not null
      and v_site_id = mon_site()
    )
  ) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  insert into pieces_utilisees (vehicule_id, piece_id, quantite, date_utilisation, utilisateur_nom)
  values (p_vehicule_id, p_piece_id, p_quantite, coalesce(p_date, current_date), p_utilisateur_nom);

  -- Décision produit : on ne refuse jamais. Le stock peut devenir négatif, il
  -- sera affiché en rouge « à corriger » — un écart visible vaut mieux qu'une
  -- saisie bloquée.
  insert into stocks (piece_id, site_id, quantite)
  values (p_piece_id, v_site_id, -p_quantite)
  on conflict (piece_id, site_id)
    do update set quantite = stocks.quantite - p_quantite
  returning quantite into v_apres;

  insert into mouvements_stock (
    piece_id, site_id, type, quantite, quantite_apres,
    vehicule_id, utilisateur_id, utilisateur_nom
  )
  values (
    p_piece_id, v_site_id, 'consommation', p_quantite, v_apres,
    p_vehicule_id, mon_utilisateur_id(), p_utilisateur_nom
  );

  return v_apres;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.2 Transfert d'une pièce d'un site vers un autre.
--     Le site source diminue, le site destination augmente.
-- ---------------------------------------------------------------------------
create or replace function transferer_stock(
  p_piece_id bigint,
  p_site_source bigint,
  p_site_destination bigint,
  p_quantite numeric,
  p_utilisateur_nom text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apres_source numeric;
  v_apres_destination numeric;
begin
  perform verifier_quantite(p_quantite);

  if p_site_source is null or p_site_destination is null then
    raise exception 'Site source et site de destination sont requis' using errcode = '22023';
  end if;
  if p_site_source = p_site_destination then
    raise exception 'Le site de départ et le site d''arrivée sont identiques'
      using errcode = '22023';
  end if;

  -- Un rôle à vue globale envoie depuis n'importe quel site ; un chef de
  -- détachement ne peut envoyer que depuis le sien (vers n'importe où).
  if not (
    coalesce(est_vue_globale(), false)
    or (
      mon_site() is not null
      and p_site_source = mon_site()
    )
  ) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  -- Sérialise les transferts d'une même pièce. Deux transferts en sens inverse
  -- (A→B et B→A) verrouilleraient sinon les deux mêmes lignes dans un ordre
  -- opposé, ce qui est la recette classique de l'interblocage. Le verrou porte
  -- sur la pièce, pas sur la table : le reste du stock n'est pas ralenti.
  perform pg_advisory_xact_lock(p_piece_id);

  insert into stocks (piece_id, site_id, quantite)
  values (p_piece_id, p_site_source, -p_quantite)
  on conflict (piece_id, site_id)
    do update set quantite = stocks.quantite - p_quantite
  returning quantite into v_apres_source;

  insert into stocks (piece_id, site_id, quantite)
  values (p_piece_id, p_site_destination, p_quantite)
  on conflict (piece_id, site_id)
    do update set quantite = stocks.quantite + p_quantite
  returning quantite into v_apres_destination;

  insert into mouvements_stock (
    piece_id, site_id, type, quantite, quantite_apres,
    site_origine_id, utilisateur_id, utilisateur_nom
  )
  values
    (p_piece_id, p_site_source, 'transfert_sortie', p_quantite, v_apres_source,
     p_site_destination, mon_utilisateur_id(), p_utilisateur_nom),
    (p_piece_id, p_site_destination, 'transfert_entree', p_quantite, v_apres_destination,
     p_site_source, mon_utilisateur_id(), p_utilisateur_nom);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4.3 Correction manuelle : fixer la quantité d'une pièce sur un site.
--     Journalise l'écart, de sorte qu'un ajustement d'inventaire reste traçable.
-- ---------------------------------------------------------------------------
create or replace function ajuster_stock(
  p_piece_id bigint,
  p_site_id bigint,
  p_nouvelle_quantite numeric,
  p_seuil_alerte numeric default null,
  p_motif text default null,
  p_utilisateur_nom text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avant numeric;
  v_delta numeric;
begin
  perform verifier_quantite_finie(p_nouvelle_quantite, 'Quantité');
  if p_seuil_alerte is not null then
    perform verifier_quantite_finie(p_seuil_alerte, 'Seuil d''alerte');
  end if;

  if not peut_ecrire_stock(p_site_id) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  select s.quantite into v_avant
  from stocks s
  where s.piece_id = p_piece_id and s.site_id = p_site_id;
  v_avant := coalesce(v_avant, 0);
  v_delta := p_nouvelle_quantite - v_avant;

  insert into stocks (piece_id, site_id, quantite, seuil_alerte)
  values (p_piece_id, p_site_id, p_nouvelle_quantite, coalesce(p_seuil_alerte, 0))
  on conflict (piece_id, site_id)
    do update set
      quantite = p_nouvelle_quantite,
      seuil_alerte = coalesce(p_seuil_alerte, stocks.seuil_alerte);

  -- Une saisie qui ne change rien n'a rien à journaliser.
  if v_delta <> 0 then
    insert into mouvements_stock (
      piece_id, site_id, type, quantite, quantite_apres,
      utilisateur_id, utilisateur_nom, motif
    )
    values (
      p_piece_id, p_site_id, 'correction', abs(v_delta), p_nouvelle_quantite,
      mon_utilisateur_id(), p_utilisateur_nom,
      coalesce(nullif(btrim(coalesce(p_motif, '')), ''), 'Mise à jour du stock')
    );
  end if;

  return p_nouvelle_quantite;
end;
$$;


-- ============================================================================
-- 5. MOUVEMENT DE CARBURANT ATOMIQUE
--
-- Avant : l'application insérait la ligne d'historique PUIS appelait
-- `ajuster_carburant_stock`. Si le second appel échouait, l'historique montrait
-- un mouvement qui n'avait jamais été appliqué au solde. Les deux écritures se
-- font maintenant dans la même transaction.
-- ============================================================================

create or replace function enregistrer_mouvement_carburant(
  p_site_id bigint,
  p_type text,
  p_mouvement text,
  p_quantite numeric,
  p_utilisateur_id bigint default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric;
  v_solde numeric;
begin
  if p_type is null or p_type not in ('gasoil', 'essence') then
    raise exception 'Type de carburant invalide (reçu : %)', coalesce(p_type, 'null')
      using errcode = '22023';
  end if;
  if p_mouvement is null or p_mouvement not in ('ravitaillement', 'consommation') then
    raise exception 'Mouvement invalide (reçu : %)', coalesce(p_mouvement, 'null')
      using errcode = '22023';
  end if;
  perform verifier_quantite(p_quantite, 'Quantité de carburant');

  if not peut_ecrire_carburant(p_site_id) then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  insert into mouvements_carburant (site_id, type, mouvement, quantite_litres, utilisateur_id)
  values (p_site_id, p_type, p_mouvement, p_quantite, p_utilisateur_id);

  v_delta := case when p_mouvement = 'ravitaillement' then p_quantite else -p_quantite end;

  insert into carburant_stock (site_id, type, quantite_litres)
  values (p_site_id, p_type, v_delta)
  on conflict (site_id, type)
    do update set quantite_litres = carburant_stock.quantite_litres + v_delta
  returning quantite_litres into v_solde;

  return v_solde;
end;
$$;


-- ============================================================================
-- 6. DROITS D'EXÉCUTION
--
-- Par défaut, toute fonction créée dans le schéma public est exécutable par
-- PUBLIC, donc aussi par `anon` — c'est ce qui a permis à un visiteur sans
-- session d'appeler `ajuster_carburant_stock` pendant l'audit. On referme.
--
-- Note : on ne touche PAS aux droits de lecture des tables pour `anon`. Les
-- RLS les bloquent déjà (vérifié : 0 ligne lisible sans session), et retirer
-- ces droits couperait le repli anonyme du cron `/api/keep-alive` — sans gain
-- de sécurité réel.
-- ============================================================================

revoke all on function est_vue_globale() from public, anon;
revoke all on function peut_ecrire_stock(bigint) from public, anon;
revoke all on function peut_ecrire_carburant(bigint) from public, anon;
revoke all on function verifier_quantite(numeric, text) from public, anon;
revoke all on function verifier_quantite_finie(numeric, text) from public, anon;
revoke all on function mon_role() from public, anon;
revoke all on function mon_site() from public, anon;
revoke all on function mon_utilisateur_id() from public, anon;
revoke all on function ajuster_carburant_stock(bigint, text, numeric) from public, anon;
revoke all on function enregistrer_utilisation(bigint, bigint, numeric, date, text) from public, anon;
revoke all on function transferer_stock(bigint, bigint, bigint, numeric, text) from public, anon;
revoke all on function ajuster_stock(bigint, bigint, numeric, numeric, text, text) from public, anon;
revoke all on function enregistrer_mouvement_carburant(bigint, text, text, numeric, bigint) from public, anon;

grant execute on function est_vue_globale() to authenticated;
grant execute on function peut_ecrire_stock(bigint) to authenticated;
grant execute on function peut_ecrire_carburant(bigint) to authenticated;
grant execute on function mon_role() to authenticated;
grant execute on function mon_site() to authenticated;
grant execute on function mon_utilisateur_id() to authenticated;
grant execute on function ajuster_carburant_stock(bigint, text, numeric) to authenticated;
grant execute on function enregistrer_utilisation(bigint, bigint, numeric, date, text) to authenticated;
grant execute on function transferer_stock(bigint, bigint, bigint, numeric, text) to authenticated;
grant execute on function ajuster_stock(bigint, bigint, numeric, numeric, text, text) to authenticated;
grant execute on function enregistrer_mouvement_carburant(bigint, text, text, numeric, bigint) to authenticated;

-- Et pour les fonctions qui seront créées plus tard :
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public grant execute on functions to authenticated;


-- ============================================================================
-- 7. LE STOCK N'EST PLUS MODIFIABLE EN DIRECT
--
-- Tant que l'application pouvait écrire `stocks` directement, une modification
-- passée par les policies RLS n'apparaissait dans aucun journal : le journal
-- n'aurait donc expliqué qu'une partie des variations, ce qui le rendrait
-- trompeur. Désormais, seules les fonctions ci-dessus écrivent le stock, et
-- chacune laisse une trace.
-- ============================================================================

revoke insert, update, delete on stocks from authenticated, anon;
grant select on stocks to authenticated;
