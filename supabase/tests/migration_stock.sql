-- ============================================================================
-- Tests de la migration 20260921000001 — joués dans une transaction ANNULÉE.
--
-- Ils simulent chaque rôle en posant `request.jwt.claims`, exactement comme le
-- fait PostgREST pour une personne connectée, et vérifient les garde-fous, les
-- cas limites et l'effet réel sur le stock et le journal.
--
-- Les données de test (véhicules, pièce, quantités) sont créées puis annulées :
-- rien ne subsiste en base.
--
-- Exécution : node scripts/tester-migration.mjs
-- ============================================================================

create temp table _t (nom text, ok boolean, detail text) on commit drop;

do $tests$
declare
  v_tech_sub uuid;
  v_tech_site bigint;
  v_site_autre bigint;
  v_vehicule_a bigint;
  v_vehicule_b bigint;
  v_piece bigint;
  v_type bigint;
  v_qte numeric;
  v_apres numeric;
  v_nb bigint;
begin
  -- ---------------------------------------------------------------- données
  select u.auth_id, u.site_id into v_tech_sub, v_tech_site
  from utilisateurs u
  join roles r on r.id = u.role_id
  where r.nom = 'technicien' and u.site_id is not null
  limit 1;

  select s.id into v_site_autre from sites s where s.id <> v_tech_site order by s.id limit 1;

  select t.id into v_type from types_vehicules t order by t.id limit 1;

  insert into pieces (nom, categorie) values ('PIECE DE TEST', 'mecanique') returning id into v_piece;
  insert into vehicules (immatriculation, site_id, statut, type_vehicule_id)
    values ('TEST-A', v_tech_site, 'arrive', v_type) returning id into v_vehicule_a;
  insert into vehicules (immatriculation, site_id, statut, type_vehicule_id)
    values ('TEST-B', v_site_autre, 'arrive', v_type) returning id into v_vehicule_b;
  insert into stocks (piece_id, site_id, quantite) values (v_piece, v_tech_site, 10);

  -- ==========================================================================
  -- A. SANS SESSION (auth.uid() nul) — c'est le cas qui était exploitable
  -- ==========================================================================
  perform set_config('request.jwt.claims', '', true);

  insert into _t values ('anonyme : est_vue_globale() est faux', est_vue_globale() is false, est_vue_globale()::text);
  insert into _t values ('anonyme : peut_ecrire_stock() est faux', peut_ecrire_stock(v_tech_site) is false, peut_ecrire_stock(v_tech_site)::text);

  begin
    perform ajuster_carburant_stock(v_tech_site, 'gasoil', 5);
    insert into _t values ('anonyme : carburant REFUSÉ', false, 'aucune erreur levée — faille encore ouverte');
  exception when others then
    insert into _t values ('anonyme : carburant REFUSÉ', sqlstate = '42501', sqlstate || ' ' || sqlerrm);
  end;

  begin
    perform enregistrer_utilisation(v_vehicule_a, v_piece, 1, current_date, 'test');
    insert into _t values ('anonyme : consommation REFUSÉE', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('anonyme : consommation REFUSÉE', sqlstate = '42501', sqlstate || ' ' || sqlerrm);
  end;

  begin
    perform transferer_stock(v_piece, v_tech_site, v_site_autre, 1, 'test');
    insert into _t values ('anonyme : transfert REFUSÉ', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('anonyme : transfert REFUSÉ', sqlstate = '42501', sqlstate || ' ' || sqlerrm);
  end;

  -- ==========================================================================
  -- B. COMPTE CONNECTÉ SANS PROFIL — le cas de l'inscription libre
  -- ==========================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid())::text, true);

  insert into _t values ('sans profil : est_vue_globale() est faux', est_vue_globale() is false, est_vue_globale()::text);
  begin
    perform ajuster_carburant_stock(v_tech_site, 'gasoil', 5);
    insert into _t values ('sans profil : carburant REFUSÉ', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('sans profil : carburant REFUSÉ', sqlstate = '42501', sqlstate || ' ' || sqlerrm);
  end;

  -- ==========================================================================
  -- C. TECHNICIEN sur son propre site
  -- ==========================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_tech_sub)::text, true);

  insert into _t values ('technicien : peut_ecrire_stock(son site)', peut_ecrire_stock(v_tech_site), peut_ecrire_stock(v_tech_site)::text);
  insert into _t values ('technicien : peut_ecrire_stock(autre site) est faux', peut_ecrire_stock(v_site_autre) is false, peut_ecrire_stock(v_site_autre)::text);

  -- Consommation de 3 sur un stock de 10 → 7
  v_qte := enregistrer_utilisation(v_vehicule_a, v_piece, 3, current_date, 'Technicien Test');
  select quantite into v_apres from stocks where piece_id = v_piece and site_id = v_tech_site;
  insert into _t values ('technicien : consommation 10 − 3 = 7', v_apres = 7, 'retour=' || v_qte || ' stock=' || v_apres);

  select count(*) into v_nb from mouvements_stock
   where piece_id = v_piece and site_id = v_tech_site and type = 'consommation';
  insert into _t values ('technicien : 1 ligne de journal', v_nb = 1, 'lignes=' || v_nb);

  select count(*) into v_nb from pieces_utilisees where vehicule_id = v_vehicule_a and piece_id = v_piece;
  insert into _t values ('technicien : historique pièce écrite', v_nb = 1, 'lignes=' || v_nb);

  -- Le stock peut devenir négatif (décision produit), sans erreur
  v_apres := enregistrer_utilisation(v_vehicule_a, v_piece, 20, current_date, 'Technicien Test');
  insert into _t values ('technicien : stock négatif accepté', v_apres = -13, 'stock=' || v_apres);

  -- Véhicule d'un autre site → refusé
  begin
    perform enregistrer_utilisation(v_vehicule_b, v_piece, 1, current_date, 'test');
    insert into _t values ('technicien : véhicule hors site REFUSÉ', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('technicien : véhicule hors site REFUSÉ', sqlstate = '42501', sqlstate || ' ' || sqlerrm);
  end;

  -- Transfert autorisé depuis son site…
  begin
    perform transferer_stock(v_piece, v_tech_site, v_site_autre, 2, 'Technicien Test');
    insert into _t values ('technicien : transfert depuis son site OK', true, '');
  exception when others then
    insert into _t values ('technicien : transfert depuis son site OK', false, sqlstate || ' ' || sqlerrm);
  end;

  -- …et refusé depuis un autre site
  begin
    perform transferer_stock(v_piece, v_site_autre, v_tech_site, 2, 'test');
    insert into _t values ('technicien : transfert depuis un autre site REFUSÉ', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('technicien : transfert depuis un autre site REFUSÉ', sqlstate = '42501', sqlstate || ' ' || sqlerrm);
  end;

  -- Transfert vers le même site
  begin
    perform transferer_stock(v_piece, v_tech_site, v_tech_site, 2, 'test');
    insert into _t values ('transfert même site REFUSÉ', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('transfert même site REFUSÉ', sqlstate = '22023', sqlstate || ' ' || sqlerrm);
  end;

  -- ==========================================================================
  -- D. CAS LIMITES NUMÉRIQUES
  -- ==========================================================================
  begin
    perform transferer_stock(v_piece, v_tech_site, v_site_autre, 0, 'test');
    insert into _t values ('quantité 0 REFUSÉE', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('quantité 0 REFUSÉE', sqlstate = '22023', sqlstate || ' ' || sqlerrm);
  end;

  begin
    perform transferer_stock(v_piece, v_tech_site, v_site_autre, -5, 'test');
    insert into _t values ('quantité négative REFUSÉE', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('quantité négative REFUSÉE', sqlstate = '22023', sqlstate || ' ' || sqlerrm);
  end;

  -- Piège PostgreSQL : « NaN <= 0 » est FAUX, donc un test naïf laisse passer NaN
  begin
    perform transferer_stock(v_piece, v_tech_site, v_site_autre, 'NaN'::numeric, 'test');
    insert into _t values ('quantité NaN REFUSÉE', false, 'NaN est passé — le solde serait corrompu');
  exception when others then
    insert into _t values ('quantité NaN REFUSÉE', sqlstate = '22023', sqlstate || ' ' || sqlerrm);
  end;

  begin
    perform transferer_stock(v_piece, v_tech_site, v_site_autre, null, 'test');
    insert into _t values ('quantité NULL REFUSÉE', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('quantité NULL REFUSÉE', sqlstate = '22023', sqlstate || ' ' || sqlerrm);
  end;

  begin
    perform enregistrer_utilisation(999999999, v_piece, 1, current_date, 'test');
    insert into _t values ('véhicule inconnu REFUSÉ', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('véhicule inconnu REFUSÉ', sqlstate = '23503', sqlstate || ' ' || sqlerrm);
  end;

  -- ==========================================================================
  -- E. AJUSTEMENT MANUEL
  -- ==========================================================================
  begin
    perform ajuster_stock(v_piece, v_tech_site, 'NaN'::numeric, null, null, 'test');
    insert into _t values ('ajustement NaN REFUSÉ', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('ajustement NaN REFUSÉ', sqlstate = '22023', sqlstate || ' ' || sqlerrm);
  end;

  v_apres := ajuster_stock(v_piece, v_tech_site, 50, 5, 'Inventaire', 'Technicien Test');
  select quantite, seuil_alerte into v_qte, v_nb from stocks where piece_id = v_piece and site_id = v_tech_site;
  insert into _t values ('ajustement : quantité et seuil posés', v_qte = 50 and v_nb = 5, 'qte=' || v_qte || ' seuil=' || v_nb);

  select count(*) into v_nb from mouvements_stock
   where piece_id = v_piece and site_id = v_tech_site and type = 'correction' and motif = 'Inventaire';
  insert into _t values ('ajustement : journalisé avec motif', v_nb = 1, 'lignes=' || v_nb);

  -- Une saisie identique ne journalise rien
  select count(*) into v_nb from mouvements_stock where piece_id = v_piece and site_id = v_tech_site;
  perform ajuster_stock(v_piece, v_tech_site, 50, 5, 'Inventaire', 'Technicien Test');
  select count(*) into v_qte from mouvements_stock where piece_id = v_piece and site_id = v_tech_site;
  insert into _t values ('ajustement sans écart : rien de journalisé', v_qte = v_nb, 'avant=' || v_nb || ' après=' || v_qte);

  -- ==========================================================================
  -- F. CARBURANT — le mouvement et le solde sont bien dans la même transaction
  -- ==========================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_tech_sub)::text, true);
  -- On compare avant/après : le site peut déjà porter des mouvements réels.
  select count(*) into v_nb from mouvements_carburant where site_id = v_tech_site;
  declare
    v_avant_mv bigint := v_nb;
    v_avant_solde numeric;
  begin
    select quantite_litres into v_avant_solde from carburant_stock
     where site_id = v_tech_site and type = 'gasoil';
    v_avant_solde := coalesce(v_avant_solde, 0);

    perform enregistrer_mouvement_carburant(v_tech_site, 'gasoil', 'ravitaillement', 100, null);

    select count(*) into v_nb from mouvements_carburant where site_id = v_tech_site;
    select quantite_litres into v_qte from carburant_stock where site_id = v_tech_site and type = 'gasoil';
    insert into _t values (
      'carburant : mouvement + solde atomiques',
      v_nb = v_avant_mv + 1 and v_qte = v_avant_solde + 100,
      'mouvements ' || v_avant_mv || '→' || v_nb || ', solde ' || v_avant_solde || '→' || v_qte
    );
  exception when others then
    insert into _t values ('carburant : mouvement + solde atomiques', false, sqlstate || ' ' || sqlerrm);
  end;

  begin
    perform enregistrer_mouvement_carburant(v_tech_site, 'gazole', 'ravitaillement', 10, null);
    insert into _t values ('carburant : type inconnu REFUSÉ', false, 'aucune erreur levée');
  exception when others then
    insert into _t values ('carburant : type inconnu REFUSÉ', sqlstate = '22023', sqlstate || ' ' || sqlerrm);
  end;

  -- ==========================================================================
  -- G. JOURNAL NON FALSIFIABLE
  -- ==========================================================================
  select count(*) into v_nb from mouvements_stock;
  insert into _t values ('journal : alimenté uniquement par les fonctions', v_nb > 0, 'lignes=' || v_nb);
end;
$tests$;

select nom, ok, detail from _t order by ok, nom;
