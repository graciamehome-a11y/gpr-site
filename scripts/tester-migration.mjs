/**
 * Joue la migration + ses tests dans une transaction ANNULÉE sur le projet
 * Supabase cloud, et affiche le résultat de chaque vérification.
 *
 * Rien n'est conservé en base : le script se termine toujours par un rollback.
 *
 * Usage : SUPABASE_ACCESS_TOKEN=sbp_… node scripts/tester-migration.mjs
 */
import { readFileSync } from "node:fs";

const REF = process.env.SUPABASE_PROJECT_REF || "ybnivixfoqaydbwqqbzp";
const jeton = process.env.SUPABASE_ACCESS_TOKEN;

if (!jeton) {
  console.error("SUPABASE_ACCESS_TOKEN manquant.");
  process.exit(1);
}

const migration = readFileSync(
  new URL("../supabase/migrations/20260921000001_securite_et_mouvements_stock.sql", import.meta.url),
  "utf8",
);
const tests = readFileSync(new URL("../supabase/tests/migration_stock.sql", import.meta.url), "utf8");

const requete = `begin;\n${migration}\n${tests}\nrollback;`;

const reponse = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: requete }),
});

const texte = await reponse.text();
let corps;
try {
  corps = JSON.parse(texte);
} catch {
  corps = texte;
}

if (!reponse.ok) {
  console.error(`❌ Les tests n'ont pas pu être exécutés (HTTP ${reponse.status})`);
  console.error(typeof corps === "string" ? corps : JSON.stringify(corps, null, 2));
  process.exit(1);
}

const lignes = Array.isArray(corps) ? corps : [];
if (!lignes.length) {
  console.error("Aucun résultat renvoyé — la requête n'a pas produit de lignes.");
  console.error(JSON.stringify(corps).slice(0, 800));
  process.exit(1);
}

const enEchec = lignes.filter((l) => l.ok !== true);
for (const l of lignes) {
  console.log(`${l.ok === true ? "✅" : "❌"} ${l.nom}${l.detail ? `  (${l.detail})` : ""}`);
}
console.log(
  `\n${lignes.length - enEchec.length}/${lignes.length} vérifications passées` +
    (enEchec.length ? ` — ${enEchec.length} en échec` : ""),
);
process.exit(enEchec.length ? 1 : 0);
