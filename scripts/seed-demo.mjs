// Données de démonstration pour le stack LOCAL (Docker) uniquement.
// Permet de voir les tableaux de bord et les listes peuplés en QA.
// Ne touche jamais la production : lit les clés dans .env.development.local.
//
//   node scripts/seed-demo.mjs           # insère les données de démo
//   node scripts/seed-demo.mjs --reset   # efface d'abord les lignes transactionnelles
//
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.development.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("URL ou SUPABASE_SERVICE_ROLE_KEY absente de .env.development.local");
  process.exit(1);
}
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  console.error(`Refus : l'URL ne pointe pas vers un stack local (${url}).`);
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const reset = process.argv.includes("--reset");

function nom(id, liste) {
  return liste.find((x) => x.id === id);
}

const { data: sites } = await db.from("sites").select("id, nom, type");
const { data: pieces } = await db.from("pieces").select("id, nom").order("id");
const { data: users } = await db.from("utilisateurs").select("id, prenom, nom, roles(nom)");

const central = sites.find((s) => s.type === "central");
const d1 = sites.find((s) => s.nom.includes("Nikki"));
const d2 = sites.find((s) => s.nom.includes("Bessassi"));
const reserve = sites.find((s) => s.type === "reserve");
const tech = users.find((u) => u.roles?.nom === "technicien");

if (reset) {
  for (const t of [
    "mouvements_carburant",
    "carburant_stock",
    "pieces_utilisees",
    "demandes_pieces",
    "vehicules",
    "stocks",
  ]) {
    await db.from(t).delete().gte("id", 0);
  }
  console.log("· lignes transactionnelles effacées");
}

// --- Stocks : réparti sur les sites, avec quelques pièces sous le seuil ---
const stocks = [];
const repartition = [
  [central, [0, 1, 3, 4, 5, 6, 7]],
  [d1, [3, 4, 5, 8]],
  [d2, [3, 4, 5, 9]],
  [reserve, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
];
for (const [site, idxs] of repartition) {
  idxs.forEach((idx, n) => {
    const p = pieces[idx];
    if (!p) return;
    const seuil = [2, 3, 5][n % 3];
    // une pièce sur quatre passe sous le seuil
    const q = n % 4 === 0 ? Math.max(0, seuil - 1) : seuil + 3 + ((n * 2) % 7);
    stocks.push({ piece_id: p.id, site_id: site.id, quantite: q, seuil_alerte: seuil });
  });
}
await db.from("stocks").upsert(stocks, { onConflict: "piece_id,site_id" });
console.log(`· ${stocks.length} lignes de stock`);

// --- Véhicules : différents types, sites et statuts ---
const vehicules = [
  { immatriculation: "BN-4412-RB", statut: "en_reparation", type_vehicule_id: 1, site_id: central.id },
  { immatriculation: "BN-8890-RB", statut: "arrive", type_vehicule_id: 4, site_id: central.id },
  { immatriculation: "BN-2201-RB", statut: "pret", type_vehicule_id: 9, site_id: d1.id },
  { immatriculation: "BN-7734-RB", statut: "en_reparation", type_vehicule_id: 10, site_id: d1.id },
  { immatriculation: "BN-5567-RB", statut: "transfere", type_vehicule_id: 5, site_id: d2.id },
  { immatriculation: "BN-9903-RB", statut: "arrive", type_vehicule_id: 2, site_id: d2.id },
];
const { data: vehIns } = await db.from("vehicules").insert(vehicules).select("id, immatriculation, site_id");
console.log(`· ${vehIns.length} véhicules`);

// --- Bons : statuts variés, sur plusieurs sites ---
const today = new Date();
const jour = (d) => new Date(today.getTime() - d * 864e5).toISOString().slice(0, 10);
const demandeur = tech ? `${tech.prenom} ${tech.nom}` : "Technicien Test";
const bons = [
  { piece_id: pieces[3].id, quantite: 4, statut: "en_attente", site_id: d1.id, vehicule_nom: "BN-7734-RB", date_demande: jour(1), demandeur_nom: demandeur, demandeur_id: tech?.id ?? null },
  { piece_id: pieces[6].id, quantite: 2, statut: "en_attente", site_id: central.id, vehicule_nom: "BN-4412-RB", date_demande: jour(2), demandeur_nom: demandeur, demandeur_id: tech?.id ?? null },
  { piece_id: pieces[5].id, quantite: 1, statut: "valide", site_id: d2.id, vehicule_nom: "BN-5567-RB", date_demande: jour(4), demandeur_nom: demandeur, demandeur_id: tech?.id ?? null },
  { piece_id: pieces[4].id, quantite: 6, statut: "livre", site_id: d1.id, vehicule_nom: "BN-2201-RB", date_demande: jour(7), demandeur_nom: demandeur, demandeur_id: tech?.id ?? null },
  { piece_id: pieces[9].id, quantite: 1, statut: "refuse", site_id: central.id, vehicule_nom: "BN-8890-RB", date_demande: jour(9), demandeur_nom: demandeur, demandeur_id: tech?.id ?? null },
];
await db.from("demandes_pieces").insert(bons);
console.log(`· ${bons.length} bons`);

// --- Pièces utilisées (historique récent) ---
const enRep = vehIns.filter((v) => ["BN-4412-RB", "BN-7734-RB"].includes(v.immatriculation));
const utilisations = enRep.flatMap((v, i) => [
  { vehicule_id: v.id, piece_id: pieces[3].id, quantite: 1, date_utilisation: jour(i + 1), utilisateur_nom: demandeur },
  { vehicule_id: v.id, piece_id: pieces[4].id, quantite: 2, date_utilisation: jour(i + 3), utilisateur_nom: demandeur },
]);
await db.from("pieces_utilisees").insert(utilisations);
console.log(`· ${utilisations.length} pièces utilisées`);

// --- Carburant : soldes + quelques mouvements sur les deux détachements ---
await db.from("carburant_stock").upsert(
  [
    { site_id: d1.id, type: "gasoil", quantite_litres: 320 },
    { site_id: d1.id, type: "essence", quantite_litres: 85 },
    { site_id: d2.id, type: "gasoil", quantite_litres: 140 },
    { site_id: d2.id, type: "essence", quantite_litres: 40 },
  ],
  { onConflict: "site_id,type" },
);
await db.from("mouvements_carburant").insert([
  { site_id: d1.id, type: "gasoil", mouvement: "ravitaillement", quantite_litres: 200, utilisateur_id: tech?.id ?? null },
  { site_id: d1.id, type: "gasoil", mouvement: "consommation", quantite_litres: 60, utilisateur_id: tech?.id ?? null },
  { site_id: d2.id, type: "essence", mouvement: "consommation", quantite_litres: 15, utilisateur_id: tech?.id ?? null },
]);
console.log("· carburant : 4 soldes + 3 mouvements");

console.log("\nDémo prête. Rechargez http://localhost:3000");
