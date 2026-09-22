/**
 * Test du catalogue : créer un type de véhicule, y rattacher une pièce,
 * vérifier que l'ensemble apparaît bien dans la page, puis tout supprimer.
 *
 * Reproduit les opérations des actions de app/catalogue/actions.ts avec une
 * vraie session, et vérifie au passage que l'unicité du catalogue est bien
 * appliquée côté base.
 *
 * Usage : URL_APP=https://garage-gracia.vercel.app node scripts/tester-catalogue.mjs
 */
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.URL_APP || "http://localhost:3100";
const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const jar = new Map();
const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (liste) => liste.forEach(({ name, value }) => jar.set(name, value)),
  },
});
const { error: errConnexion } = await client.auth.signInWithPassword({
  email: "chef.garage@test.local",
  password: "Test1234!",
});
if (errConnexion) {
  console.error("Connexion impossible :", errConnexion.message);
  process.exit(1);
}
const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");

const marque = `ZZTEST${Date.now().toString().slice(-6)}`;
const resultats = [];
const verifier = (nom, ok, detail = "") => resultats.push({ nom, ok: !!ok, detail });

console.log(`Site testé : ${BASE}`);
console.log(`Type de test : ${marque}\n`);

let idType = null;
let idPiece = null;

try {
  // ---------------------------------------------------- création du type
  const { data: type, error: errType } = await client
    .from("types_vehicules")
    .insert({ nom: marque, marque: "Test" })
    .select("id, nom")
    .single();
  verifier("créer un type de véhicule", !errType && !!type?.id, errType?.message);
  if (!type) throw new Error("création du type impossible, arrêt");
  idType = type.id;

  // ------------------------------------------------- création de la pièce
  const nomPiece = `Pièce de test ${marque}`;
  const { data: piece, error: errPiece } = await client
    .from("pieces")
    .insert({ nom: nomPiece, categorie: "test", type_vehicule_id: idType })
    .select("id")
    .single();
  verifier("rattacher une pièce à ce véhicule", !errPiece && !!piece?.id, errPiece?.message);
  if (piece) idPiece = piece.id;

  // ------------------------------------------------------- unicité bloquée
  const { error: errDoublon } = await client
    .from("pieces")
    .insert({ nom: nomPiece, type_vehicule_id: idType });
  verifier(
    "refuser deux fois la même pièce pour le même véhicule",
    !!errDoublon && (errDoublon.code === "23505" || /duplicate|unique/i.test(errDoublon.message)),
    errDoublon ? errDoublon.code : "aucune erreur — le doublon est passé",
  );

  // --------------------------- le même nom pour un AUTRE véhicule : autorisé
  const { data: autreType } = await client
    .from("types_vehicules")
    .select("id")
    .neq("id", idType)
    .limit(1)
    .maybeSingle();
  if (autreType) {
    const { error: errAutre } = await client
      .from("pieces")
      .insert({ nom: nomPiece, type_vehicule_id: autreType.id });
    verifier(
      "autoriser le même nom pour un véhicule différent",
      !errAutre,
      errAutre?.message,
    );
    if (!errAutre) {
      await client.from("pieces").delete().eq("nom", nomPiece).eq("type_vehicule_id", autreType.id);
    }
  }

  // ------------------------------------------- visible dans la page
  const html = await (await fetch(`${BASE}/catalogue`, { headers: { cookie } })).text();
  verifier("le nouveau type apparaît dans le catalogue", html.includes(marque));
  verifier("la nouvelle pièce apparaît dans le catalogue", html.includes(nomPiece));

  // ------------------------------------ suppression protégée puis autorisée
  const { error: errSupprType } = await client.from("types_vehicules").delete().eq("id", idType);
  verifier(
    "refuser de supprimer un type encore utilisé",
    !!errSupprType && errSupprType.code === "23503",
    errSupprType ? errSupprType.code : "suppression acceptée alors que la pièce existe",
  );

  const { error: errSupprPiece } = await client.from("pieces").delete().eq("id", idPiece);
  verifier("supprimer une pièce libre", !errSupprPiece, errSupprPiece?.message);
  if (!errSupprPiece) idPiece = null;

  const { error: errSupprType2 } = await client.from("types_vehicules").delete().eq("id", idType);
  verifier("supprimer le type une fois la pièce retirée", !errSupprType2, errSupprType2?.message);
  if (!errSupprType2) idType = null;
} catch (e) {
  verifier("déroulement du test", false, String(e.message ?? e));
} finally {
  if (idPiece) await client.from("pieces").delete().eq("id", idPiece);
  if (idType) await client.from("types_vehicules").delete().eq("id", idType);
  console.log("\n(nettoyage effectué)\n");
}

for (const r of resultats) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.nom}${r.detail ? `  (${r.detail})` : ""}`);
}
const echecs = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passées`);
process.exit(echecs.length ? 1 : 0);
