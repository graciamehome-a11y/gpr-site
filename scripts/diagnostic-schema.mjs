/**
 * Diagnostic de schéma — lecture seule, contre le projet Supabase cloud.
 * Affiche les colonnes réellement présentes en production (et non celles
 * supposées par les migrations locales) + les fonctions RPC disponibles.
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

const TABLES = [
  "sites", "roles", "utilisateurs", "types_vehicules", "pieces", "stocks",
  "vehicules", "pieces_utilisees", "demandes_pieces", "carburant_stock",
  "mouvements_carburant", "mouvements_stock",
];

console.log("=== Colonnes réellement présentes en production ===");
for (const t of TABLES) {
  const { data, error } = await db.from(t).select("*").limit(1);
  if (error) {
    console.log(`${t.padEnd(22)} ❌ ${error.message}`);
    continue;
  }
  const cols = data.length ? Object.keys(data[0]) : [];
  console.log(`${t.padEnd(22)} ${cols.length ? cols.join(", ") : "(table vide → colonnes indéterminées)"}`);
}

console.log("\n=== Fonctions RPC ===");
for (const f of ["mon_role", "mon_site", "mon_utilisateur_id", "ajuster_carburant_stock", "consommer_piece", "transferer_stock", "ajuster_stock"]) {
  const { error } = await db.rpc(f);
  const absente = !!error && (error.code === "PGRST202" || /could not find|does not exist/i.test(error.message));
  console.log(`  ${f.padEnd(24)} ${absente ? "❌ absente" : "✅ présente"}`);
}
console.log("");
