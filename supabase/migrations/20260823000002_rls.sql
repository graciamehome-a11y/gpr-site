-- ============================================================
-- GPR — Fonctions rôle/site + policies RLS + carburant atomique
-- À exécuter UNE FOIS dans Supabase : Dashboard > SQL Editor > New query
-- Idempotent : peut être rejoué sans risque si besoin.
-- ============================================================

-- 1. Fonctions utilitaires : rôle et site de la personne connectée
create or replace function mon_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.nom
  from utilisateurs u
  join roles r on r.id = u.role_id
  where u.auth_id = auth.uid()
$$;

create or replace function mon_site()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select u.site_id
  from utilisateurs u
  where u.auth_id = auth.uid()
$$;

create or replace function mon_utilisateur_id()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select u.id
  from utilisateurs u
  where u.auth_id = auth.uid()
$$;

-- 2. RLS activé partout (ferme l'accès public/anon par défaut)
alter table sites enable row level security;
alter table roles enable row level security;
alter table utilisateurs enable row level security;
alter table types_vehicules enable row level security;
alter table pieces enable row level security;
alter table stocks enable row level security;
alter table vehicules enable row level security;
alter table pieces_utilisees enable row level security;
alter table demandes_pieces enable row level security;
alter table carburant_stock enable row level security;
alter table mouvements_carburant enable row level security;

-- 3. On repart propre : supprime toute policy existante sur le schema public
do $$
declare pol record;
begin
  for pol in select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- 4. Référentiels : lecture pour toute personne connectée
create policy "lecture_authentifie" on sites for select to authenticated using (true);
create policy "lecture_authentifie" on roles for select to authenticated using (true);
create policy "lecture_authentifie" on types_vehicules for select to authenticated using (true);
create policy "lecture_authentifie" on pieces for select to authenticated using (true);

-- 5. utilisateurs : chacun voit sa ligne ; les rôles à vue globale voient tout le monde (utile pour /admin/comptes)
create policy "sa_propre_ligne" on utilisateurs for select to authenticated
  using (auth_id = auth.uid() or mon_role() in ('chef_garage','comptable_matieres','chef_service_technique'));

create policy "creation_admin" on utilisateurs for insert to authenticated
  with check (mon_role() in ('chef_garage','comptable_matieres','chef_service_technique'));

-- 6. stocks : vue globale = tous les sites ; vue restreinte = son site
create policy "lecture_stocks" on stocks for select to authenticated
  using (mon_role() in ('chef_garage','comptable_matieres','chef_service_technique') or site_id = mon_site());

create policy "ecriture_stocks" on stocks for insert to authenticated
  with check (
    mon_role() in ('chef_garage','comptable_matieres','chef_service_technique')
    or (mon_role() = 'chef_detachement' and site_id = mon_site())
  );

create policy "maj_stocks" on stocks for update to authenticated
  using (
    mon_role() in ('chef_garage','comptable_matieres','chef_service_technique')
    or (mon_role() = 'chef_detachement' and site_id = mon_site())
  );

-- 7. vehicules : vue globale = tous les sites ; vue restreinte = son site
create policy "lecture_vehicules" on vehicules for select to authenticated
  using (mon_role() in ('chef_garage','comptable_matieres','chef_service_technique') or site_id = mon_site());

create policy "ecriture_vehicules" on vehicules for insert to authenticated
  with check (mon_role() in ('chef_garage','comptable_matieres','chef_service_technique') or site_id = mon_site());

create policy "maj_vehicules" on vehicules for update to authenticated
  using (mon_role() in ('chef_garage','comptable_matieres','chef_service_technique') or site_id = mon_site());

-- 8. pieces_utilisees : filtré via le site du véhicule concerné (pas de site_id direct sur cette table)
create policy "lecture_pieces_utilisees" on pieces_utilisees for select to authenticated
  using (
    mon_role() in ('chef_garage','comptable_matieres','chef_service_technique')
    or exists (select 1 from vehicules v where v.id = pieces_utilisees.vehicule_id and v.site_id = mon_site())
  );

create policy "ecriture_pieces_utilisees" on pieces_utilisees for insert to authenticated
  with check (
    mon_role() in ('chef_garage','comptable_matieres','chef_service_technique')
    or exists (select 1 from vehicules v where v.id = pieces_utilisees.vehicule_id and v.site_id = mon_site())
  );

-- 9. demandes_pieces : filtré directement par site_id
create policy "lecture_demandes" on demandes_pieces for select to authenticated
  using (mon_role() in ('chef_garage','comptable_matieres','chef_service_technique') or site_id = mon_site());

create policy "creation_demandes" on demandes_pieces for insert to authenticated
  with check (mon_role() in ('chef_garage','comptable_matieres','chef_service_technique') or site_id = mon_site());

create policy "maj_demandes" on demandes_pieces for update to authenticated
  using (mon_role() in ('chef_garage','comptable_matieres','chef_service_technique') or site_id = mon_site());

-- 10. Carburant : technicien/chef_detachement (leur détachement) + chef_service_technique (les deux) ;
--     chef_garage et comptable_matieres explicitement exclus (règle §5 du cahier des charges)
create policy "lecture_carburant_stock" on carburant_stock for select to authenticated
  using (
    mon_role() = 'chef_service_technique'
    or (mon_role() in ('technicien','chef_detachement') and site_id = mon_site())
  );

create policy "lecture_mouvements_carburant" on mouvements_carburant for select to authenticated
  using (
    mon_role() = 'chef_service_technique'
    or (mon_role() in ('technicien','chef_detachement') and site_id = mon_site())
  );

create policy "ecriture_mouvements_carburant" on mouvements_carburant for insert to authenticated
  with check (
    mon_role() = 'chef_service_technique'
    or (mon_role() in ('technicien','chef_detachement') and site_id = mon_site())
  );

-- 11. Mise à jour atomique du solde carburant (remplace le read-then-write cote app, source de race condition)
create or replace function ajuster_carburant_stock(p_site_id bigint, p_type text, p_delta numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sécurité : cette fonction est SECURITY DEFINER donc contourne les RLS de la table.
  -- On revalide ici les mêmes règles que la policy d'écriture carburant.
  if not (
    mon_role() = 'chef_service_technique'
    or (mon_role() in ('technicien','chef_detachement') and p_site_id = mon_site())
  ) then
    raise exception 'Non autorisé';
  end if;

  update carburant_stock
  set quantite_litres = quantite_litres + p_delta
  where site_id = p_site_id and type = p_type;

  if not found then
    insert into carburant_stock (site_id, type, quantite_litres) values (p_site_id, p_type, greatest(p_delta, 0));
  end if;
end;
$$;

revoke all on function ajuster_carburant_stock(bigint, text, numeric) from public;
grant execute on function ajuster_carburant_stock(bigint, text, numeric) to authenticated;
