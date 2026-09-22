/**
 * Inventaire de la base de production — lecture seule, n'efface rien.
 * Sert à savoir précisément ce qu'une remise à zéro toucherait.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

console.log("=== RÉFÉRENTIEL (à conserver) ===");
for (const t of ["sites", "roles", "types_vehicules", "pieces"]) {
  const { count } = await db.from(t).select("*", { count: "exact", head: true });
  console.log(`  ${t.padEnd(18)} ${count}`);
}

console.log("\n=== DONNÉES TRANSACTIONNELLES (candidates à la remise à zéro) ===");
for (const t of [
  "vehicules",
  "stocks",
  "pieces_utilisees",
  "demandes_pieces",
  "carburant_stock",
  "mouvements_carburant",
  "mouvements_stock",
]) {
  const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
  console.log(`  ${t.padEnd(22)} ${error ? "❌ " + error.message : count}`);
}

console.log("\n=== COMPTES (utilisateurs) ===");
const { data: users } = await db
  .from("utilisateurs")
  .select("id, email, prenom, nom, roles(nom), sites(nom), auth_id")
  .order("id");
for (const u of users ?? []) {
  const test = /@test\.local$/i.test(u.email);
  console.log(
    `  ${test ? "🧪" : "  "} ${u.email.padEnd(38)} ${String(u.roles?.nom ?? "?").padEnd(24)} ${u.sites?.nom ?? "—"}`,
  );
}
console.log(`\n  Total : ${users?.length ?? 0} comptes, dont ${(users ?? []).filter((u) => /@test\.local$/i.test(u.email)).length} de test.`);

console.log("\n=== COMPTES DE CONNEXION (auth) ===");
const { data: auth } = await db.auth.admin.listUsers({ perPage: 200 });
console.log(`  Total : ${auth?.users.length ?? 0}`);
for (const u of auth?.users ?? []) {
  const test = /@test\.local$/i.test(u.email ?? "");
  console.log(
    `  ${test ? "🧪" : "  "} ${(u.email ?? "?").padEnd(38)} invité=${u.invited_at ? "oui" : "non"} dernière connexion=${u.last_sign_in_at ? u.last_sign_in_at.slice(0, 10) : "jamais"}`,
  );
}

console.log("\n=== QUELQUES PIÈCES DU CATALOGUE (nom + type de véhicule) ===");
const { data: pieces } = await db
  .from("pieces")
  .select("nom, types_vehicules(nom)")
  .order("nom")
  .limit(12);
for (const p of pieces ?? []) {
  console.log(`  ${p.nom.padEnd(34)} ${p.types_vehicules?.nom ?? "Générique"}`);
}
const { count: piecesTotal } = await db.from("pieces").select("*", { count: "exact", head: true });
const { count: sansType } = await db
  .from("pieces")
  .select("*", { count: "exact", head: true })
  .is("type_vehicule_id", null);
console.log(`\n  ${piecesTotal} pièces au total, dont ${sansType} sans type de véhicule (génériques).`);
