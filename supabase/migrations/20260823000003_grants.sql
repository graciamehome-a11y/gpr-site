-- Grants standards qu'un projet Supabase hébergé configure par défaut, et qu'il
-- faut recréer manuellement sur un schéma construit à la main comme celui-ci.
-- Les RLS (migration précédente) restent la vraie barrière : ces GRANTs ne font
-- qu'autoriser l'accès SQL de base, sans lequel Postgres refuse tout, même à service_role.

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
