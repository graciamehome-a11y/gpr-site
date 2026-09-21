/**
 * Vérifie que la migration 20260921000001 est bien appliquée sur le projet
 * Supabase cloud, et dit précisément ce qui manque si ce n'est pas le cas.
 *
 * Usage : node scripts/verifier-migration.mjs
 *   (lit .env.local ; ajouter SUPABASE_ACCESS_TOKEN pour un contrôle plus fin)
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

const resultats = [];

// 1. La table du journal
{
  const { error } = await db.from("mouvements_stock").select("id").limit(1);
  resultats.push({
    nom: "table mouvements_stock",
    ok: !error,
    detail: error?.message,
  });
}

// 2. Les fonctions, appelées avec leurs vrais arguments. Une fonction absente
//    répond PGRST202 ; une fonction présente mais refusant l'appel (pas de
//    session) répond « Non autorisé » — c'est le résultat attendu ici.
const fonctions = [
  ["est_vue_globale", {}],
  ["peut_ecrire_stock", { p_site_id: 1 }],
  ["peut_ecrire_carburant", { p_site_id: 1 }],
  ["enregistrer_utilisation", { p_vehicule_id: 1, p_piece_id: 1, p_quantite: 1, p_date: null, p_utilisateur_nom: "vérification" }],
  ["transferer_stock", { p_piece_id: 1, p_site_source: 1, p_site_destination: 2, p_quantite: 1, p_utilisateur_nom: "vérification" }],
  ["ajuster_stock", { p_piece_id: 1, p_site_id: 1, p_nouvelle_quantite: 0, p_seuil_alerte: null, p_motif: "vérification", p_utilisateur_nom: "vérification" }],
  ["enregistrer_mouvement_carburant", { p_site_id: 1, p_type: "gasoil", p_mouvement: "ravitaillement", p_quantite: 1, p_utilisateur_id: null }],
];

for (const [nom, args] of fonctions) {
  const { error } = await db.rpc(nom, args);
  const absente =
    !!error && (error.code === "PGRST202" || /could not find the function/i.test(error.message));
  resultats.push({
    nom: `fonction ${nom}`,
    ok: !absente,
    detail: absente ? "absente" : `présente (${(error?.message ?? "exécutée").slice(0, 60)})`,
  });
}

// 3. Le stock ne doit plus être modifiable directement par un rôle applicatif :
//    on le vérifie via le catalogue de privilèges si un jeton d'accès est fourni.
const jeton = process.env.SUPABASE_ACCESS_TOKEN;
if (jeton) {
  const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
  const reponse = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `select
        has_table_privilege('authenticated', 'public.stocks', 'UPDATE') as stock_maj_directe,
        has_table_privilege('authenticated', 'public.stocks', 'INSERT') as stock_insert_direct,
        has_table_privilege('authenticated', 'public.mouvements_stock', 'INSERT') as journal_insert,
        has_function_privilege('anon', 'public.ajuster_carburant_stock(bigint,text,numeric)', 'EXECUTE') as anon_carburant`,
    }),
  });
  const corps = await reponse.json();
  const l = Array.isArray(corps) ? corps[0] : null;
  if (l) {
    resultats.push({
      nom: "écriture directe du stock retirée",
      ok: l.stock_maj_directe === false && l.stock_insert_direct === false,
      detail: `update=${l.stock_maj_directe} insert=${l.stock_insert_direct}`,
    });
    resultats.push({
      nom: "journal non modifiable depuis l'application",
      ok: l.journal_insert === false,
      detail: `insert=${l.journal_insert}`,
    });
    resultats.push({
      nom: "anon ne peut plus appeler la fonction carburant",
      ok: l.anon_carburant === false,
      detail: `execute=${l.anon_carburant}`,
    });
  }
} else {
  resultats.push({
    nom: "contrôle des privilèges",
    ok: null,
    detail: "ignoré — définir SUPABASE_ACCESS_TOKEN pour ce contrôle",
  });
}

for (const r of resultats) {
  const marque = r.ok === null ? "•" : r.ok ? "✅" : "❌";
  console.log(`${marque} ${r.nom}${r.detail ? ` — ${r.detail}` : ""}`);
}

const manquants = resultats.filter((r) => r.ok === false);
console.log(
  manquants.length
    ? `\n❌ Migration NON appliquée (${manquants.length} élément(s) manquant(s)).\n   Copiez supabase/migrations/20260921000001_securite_et_mouvements_stock.sql dans le SQL Editor Supabase.`
    : "\n✅ Migration appliquée : le stock, le journal et les garde-fous sont en place.",
);
process.exit(manquants.length ? 1 : 0);
