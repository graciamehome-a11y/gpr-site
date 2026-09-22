/**
 * Remise à zéro de la base de production.
 *
 * Par défaut : SIMULATION. Rien n'est supprimé, on affiche seulement ce qui le
 * serait. Il faut ajouter `--confirmer` pour exécuter réellement.
 *
 *   node scripts/remettre-a-zero.mjs              # simulation
 *   node scripts/remettre-a-zero.mjs --confirmer  # exécution
 *
 * CONSERVÉ : les 4 sites, les 5 rôles, et les comptes réels (dont
 * odjoumitchivictoradebola@gmail.com, demandé comme administrateur).
 * SUPPRIMÉ : toutes les données métier, tout le catalogue, et les comptes de
 * test @test.local.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const confirmer = process.argv.includes("--confirmer");

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// L'ordre compte : on supprime d'abord ce qui référence le reste.
const TABLES_METIER = [
  "mouvements_stock",
  "pieces_utilisees",
  "demandes_pieces",
  "stocks",
  "mouvements_carburant",
  "carburant_stock",
  "vehicules",
  "pieces",
  "types_vehicules",
];

console.log(confirmer ? "=== REMISE À ZÉRO RÉELLE ===" : "=== SIMULATION (rien ne sera supprimé) ===");
console.log("");

async function compter(table, filtre) {
  let requete = db.from(table).select("*", { count: "exact", head: true });
  if (filtre) requete = filtre(requete);
  const { count } = await requete;
  return count ?? 0;
}

console.log("SERA SUPPRIMÉ");
for (const table of TABLES_METIER) {
  console.log(`  ${table.padEnd(22)} ${await compter(table)} ligne(s)`);
}

const { data: comptes } = await db.from("utilisateurs").select("id, email, auth_id");
const deTest = (comptes ?? []).filter((c) => /@test\.local$/i.test(c.email));
const reels = (comptes ?? []).filter((c) => !/@test\.local$/i.test(c.email));

console.log(`  ${"comptes de test".padEnd(22)} ${deTest.length} compte(s)`);

console.log("\nSERA CONSERVÉ");
const { count: nbSites } = await db.from("sites").select("*", { count: "exact", head: true });
const { count: nbRoles } = await db.from("roles").select("*", { count: "exact", head: true });
console.log(`  ${"sites".padEnd(22)} ${nbSites}`);
console.log(`  ${"roles".padEnd(22)} ${nbRoles}`);
for (const c of reels) {
  console.log(`  ${"compte réel".padEnd(22)} ${c.email}`);
}

if (!confirmer) {
  console.log("\nSimulation terminée. Pour exécuter réellement :");
  console.log("  node scripts/remettre-a-zero.mjs --confirmer");
  process.exit(0);
}

console.log("\nSuppression en cours…\n");

for (const table of TABLES_METIER) {
  const { error } = await db.from(table).delete().neq("id", -1);
  if (error) {
    console.log(`  ❌ ${table.padEnd(22)} ${error.message}`);
  } else {
    console.log(`  ✅ ${table.padEnd(22)} vidée`);
  }
}

console.log("");
for (const compte of deTest) {
  const { error } = await db.from("utilisateurs").delete().eq("id", compte.id);
  if (error) {
    console.log(`  ❌ profil ${compte.email} : ${error.message}`);
    continue;
  }
  if (compte.auth_id) {
    const { error: errAuth } = await db.auth.admin.deleteUser(compte.auth_id);
    if (errAuth) console.log(`  ⚠️  connexion ${compte.email} : ${errAuth.message}`);
  }
  console.log(`  ✅ compte de test supprimé : ${compte.email}`);
}

const { data: restants } = await db.from("utilisateurs").select("email, roles(nom)");
console.log(`\nComptes restants : ${(restants ?? []).length}`);
for (const c of restants ?? []) console.log(`  · ${c.email} (${c.roles?.nom ?? "?"})`);
console.log("\n✅ Remise à zéro terminée.");
