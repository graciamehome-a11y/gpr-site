// Crée 5 comptes de test (un par rôle) sur le stack Supabase LOCAL, avec un mot
// de passe connu — pratique pour tester rapidement chaque niveau de permission.
// Usage : SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-comptes-test.mjs
//
// Ne JAMAIS pointer ce script vers le projet cloud : il crée des comptes avec un
// mot de passe partagé et public (visible dans ce fichier), acceptable uniquement
// en local/dev.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}

export const MOT_DE_PASSE_TEST = "Test1234!";

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COMPTES = [
  { email: "technicien@test.local", nom: "Test", prenom: "Technicien", role_id: 1, site_id: 2 },
  { email: "chef.detachement@test.local", nom: "Test", prenom: "Chef Détachement", role_id: 2, site_id: 3 },
  { email: "chef.garage@test.local", nom: "Test", prenom: "Chef Garage", role_id: 3, site_id: 1 },
  { email: "comptable.matieres@test.local", nom: "Test", prenom: "Comptable Matières", role_id: 4, site_id: 4 },
  { email: "chef.technique@test.local", nom: "Test", prenom: "Chef Service Technique", role_id: 5, site_id: null },
];

for (const compte of COMPTES) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: compte.email,
    password: MOT_DE_PASSE_TEST,
    email_confirm: true,
  });

  if (error) {
    console.error(`✗ ${compte.email} : ${error.message}`);
    continue;
  }

  const { error: errorProfil } = await supabase.from("utilisateurs").insert({
    auth_id: data.user.id,
    nom: compte.nom,
    prenom: compte.prenom,
    email: compte.email,
    role_id: compte.role_id,
    site_id: compte.site_id,
  });

  if (errorProfil) {
    console.error(`✗ ${compte.email} (profil) : ${errorProfil.message}`);
    continue;
  }

  console.log(`✓ ${compte.email} — ${compte.prenom}`);
}

console.log(`\nMot de passe pour tous les comptes de test : ${MOT_DE_PASSE_TEST}`);
