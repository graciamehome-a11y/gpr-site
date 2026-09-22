-- ============================================================================
-- GPR — Migration du 2026-09-22 (n°2)
--
-- Demande à chaque personne de choisir elle-même son mot de passe à la
-- première connexion.
--
-- Pourquoi : quand un administrateur crée un compte, il génère un mot de passe
-- temporaire et le transmet. Ce mot de passe, l'administrateur le connaît. Tant
-- que la personne ne l'a pas changé, la confidentialité de son compte n'est pas
-- assurée — et rien ne l'obligeait à le faire.
--
-- Le drapeau `doit_changer_mot_de_passe` est posé à la création du compte et à
-- chaque réinitialisation. L'application redirige alors vers la page « Mon mot
-- de passe » et n'en laisse pas sortir tant que ce n'est pas fait.
--
-- Idempotent : peut être rejoué sans risque.
-- ============================================================================

alter table utilisateurs
  add column if not exists doit_changer_mot_de_passe boolean not null default false;

-- ---------------------------------------------------------------------------
-- Effacer le drapeau est la SEULE modification qu'une personne peut faire sur
-- sa propre fiche : elle ne doit évidemment pas pouvoir changer son rôle ni son
-- site. Une policy RLS d'update ne saurait pas restreindre les colonnes, d'où
-- cette fonction dédiée, qui ne touche qu'à ce champ et uniquement à sa ligne.
-- ---------------------------------------------------------------------------
create or replace function marquer_mot_de_passe_personnel()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Non autorisé' using errcode = '42501';
  end if;

  update utilisateurs
     set doit_changer_mot_de_passe = false
   where auth_id = auth.uid();
end;
$$;

revoke all on function marquer_mot_de_passe_personnel() from public, anon;
grant execute on function marquer_mot_de_passe_personnel() to authenticated;
