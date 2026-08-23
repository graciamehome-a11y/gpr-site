-- Données de référence pour le stack local (miroir du contenu réel observé
-- sur le projet cloud au 2026-08-23). Les comptes de test sont créés séparément
-- via scripts/seed-comptes-test.mjs (nécessite l'API Auth, pas du SQL pur).

insert into sites (id, nom, type) values
  (1, 'Garage Central', 'central'),
  (2, 'D1 Nikki', 'detachement'),
  (3, 'D2 Bessassi', 'detachement'),
  (4, 'Réserve Comptable Matières', 'reserve');

insert into roles (id, nom) values
  (1, 'technicien'),
  (2, 'chef_detachement'),
  (3, 'chef_garage'),
  (4, 'comptable_matieres'),
  (5, 'chef_service_technique');

insert into types_vehicules (id, nom, marque) values
  (1, 'SHACMAN VTT', 'SHACMAN'),
  (2, 'SHACMAN VTL', 'SHACMAN'),
  (3, 'SHACMAN GRUE', 'SHACMAN'),
  (4, 'VAB', null),
  (5, 'CSK', null),
  (6, 'PUMA', null),
  (7, 'ACMAT VTT', 'ACMAT'),
  (8, 'ACMAT ALTV', 'ACMAT'),
  (9, 'KIA 450', null),
  (10, 'LAND-CRUISER', null),
  (11, 'MASSTECH', null);

insert into pieces (nom, categorie, type_vehicule_id) values
  ('Courroie pompe hydraulique', 'mecanique', 4),
  ('Amortisseur AR', 'mecanique', 5),
  ('Amortisseur AR', 'mecanique', 10),
  ('Filtre à huile', 'mecanique', null),
  ('Filtre à gasoil', 'mecanique', null),
  ('Batterie 12V', 'electrique', null),
  ('Plaquettes de frein', 'mecanique', 1),
  ('Disque de frein', 'mecanique', 1),
  ('Courroie alternateur', 'mecanique', 9),
  ('Radiateur', 'mecanique', 10);

-- Repart les séquences d'identité après les inserts avec id explicite
select setval(pg_get_serial_sequence('sites', 'id'), (select max(id) from sites));
select setval(pg_get_serial_sequence('roles', 'id'), (select max(id) from roles));
select setval(pg_get_serial_sequence('types_vehicules', 'id'), (select max(id) from types_vehicules));
