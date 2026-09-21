/**
 * Applique une migration SQL au projet Supabase cloud via l'API Management.
 *
 * Usage :
 *   SUPABASE_ACCESS_TOKEN=sbp_… node scripts/migration-management-api.mjs <fichier.sql> [--appliquer]
 *
 * Sans `--appliquer`, la migration est jouée dans une transaction ANNULÉE :
 * cela valide la syntaxe et les noms d'objets sans rien modifier. C'est le mode
 * par défaut, volontairement.
 *
 * Le jeton n'est jamais écrit sur le disque : il doit être passé en variable
 * d'environnement.
 */
import { readFileSync } from "node:fs";

const REF = process.env.SUPABASE_PROJECT_REF || "ybnivixfoqaydbwqqbzp";
const jeton = process.env.SUPABASE_ACCESS_TOKEN;
const fichier = process.argv[2];
const appliquer = process.argv.includes("--appliquer");

if (!jeton) {
  console.error("SUPABASE_ACCESS_TOKEN manquant.");
  process.exit(1);
}
if (!fichier) {
  console.error("Usage : node scripts/migration-management-api.mjs <fichier.sql> [--appliquer]");
  process.exit(1);
}

const sql = readFileSync(fichier, "utf8");

// En mode vérification, on encadre par une transaction annulée. `create table`,
// `create function` et `alter default privileges` sont transactionnels : rien
// ne subsiste après le rollback.
const requete = appliquer ? sql : `begin;\n${sql}\nrollback;`;

async function executer(query) {
  const reponse = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jeton}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const texte = await reponse.text();
  let corps;
  try {
    corps = JSON.parse(texte);
  } catch {
    corps = texte;
  }
  return { ok: reponse.ok, status: reponse.status, corps };
}

console.log(
  appliquer
    ? `Application RÉELLE de ${fichier} sur ${REF}…`
    : `Vérification de ${fichier} sur ${REF} (transaction annulée, rien n'est modifié)…`,
);

const { ok, status, corps } = await executer(requete);

if (ok) {
  console.log(
    appliquer
      ? "✅ Migration appliquée."
      : "✅ Aucune erreur de syntaxe — la migration peut être appliquée.",
  );
  if (corps && !Array.isArray(corps) === false && corps.length) {
    console.log("Résultat :", JSON.stringify(corps).slice(0, 500));
  }
} else {
  console.error(`❌ Échec (HTTP ${status})`);
  console.error(typeof corps === "string" ? corps : JSON.stringify(corps, null, 2));
  process.exit(1);
}
