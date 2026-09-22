/**
 * Sauvegarde complète de la base de production dans des fichiers JSON.
 *
 * Écrit HORS du dépôt (par défaut C:\Users\DELL\gpr-site-sauvegardes) : ces
 * fichiers contiennent des adresses email et ne doivent jamais être commités.
 *
 * Usage : node scripts/sauvegarder-donnees.mjs [dossier]
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dossier = process.argv[2] ?? `C:/Users/DELL/gpr-site-sauvegardes/${horodatage}`;
mkdirSync(dossier, { recursive: true });

const TABLES = [
  "sites",
  "roles",
  "types_vehicules",
  "pieces",
  "utilisateurs",
  "vehicules",
  "stocks",
  "pieces_utilisees",
  "demandes_pieces",
  "carburant_stock",
  "mouvements_carburant",
  "mouvements_stock",
];

console.log(`Sauvegarde vers ${dossier}\n`);
let total = 0;

for (const table of TABLES) {
  // PostgREST limite à 1000 lignes par requête : on pagine pour ne rien perdre.
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await db.from(table).select("*").range(debut, debut + 999);
    if (error) {
      console.log(`  ${table.padEnd(22)} ❌ ${error.message}`);
      break;
    }
    lignes.push(...data);
    if (data.length < 1000) break;
  }
  writeFileSync(`${dossier}/${table}.json`, JSON.stringify(lignes, null, 2), "utf8");
  total += lignes.length;
  console.log(`  ${table.padEnd(22)} ${String(lignes.length).padStart(5)} ligne(s)`);
}

// Les comptes de connexion (auth) : identifiants et dates, sans les mots de passe,
// qui ne sont de toute façon jamais exportables.
try {
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  const resume = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    email_confirmed_at: u.email_confirmed_at,
    invited_at: u.invited_at,
    last_sign_in_at: u.last_sign_in_at,
    created_at: u.created_at,
    app_metadata: u.app_metadata,
    user_metadata: u.user_metadata,
  }));
  writeFileSync(`${dossier}/auth_utilisateurs.json`, JSON.stringify(resume, null, 2), "utf8");
  console.log(`  ${"auth_utilisateurs".padEnd(22)} ${String(resume.length).padStart(5)} ligne(s)`);
} catch (e) {
  console.log(`  auth_utilisateurs      ⚠️  ${e.message}`);
}

console.log(`\n${total} lignes sauvegardées dans ${dossier}`);
console.log("⚠️  Ce dossier contient des adresses email : ne pas le partager ni le versionner.");
