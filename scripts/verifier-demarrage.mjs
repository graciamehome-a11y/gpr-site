/**
 * Vérifie, sur la production, ce que voit une personne habilitée après une
 * remise à zéro : le parcours de démarrage doit s'afficher, et l'application
 * doit rester utilisable (catalogue accessible, formulaires opérants).
 *
 * Ouvre une session via un lien magique généré côté administration : aucune
 * donnée n'est modifiée.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.URL_APP || "https://garage-gracia.vercel.app";
const EMAIL = process.env.COMPTE || "graciamehome@gmail.com";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: lien, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: EMAIL,
});
if (error) {
  console.error("Impossible d'ouvrir une session :", error.message);
  process.exit(1);
}

const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: { getAll: () => [], setAll: () => {} },
});
const { data: session, error: errOtp } = await client.auth.verifyOtp({
  token_hash: lien.properties.hashed_token,
  type: "magiclink",
});
if (errOtp) {
  console.error("Session impossible :", errOtp.message);
  process.exit(1);
}

const jar = new Map();
const sessionne = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [],
    setAll: () => {},
  },
});
// On rejoue la connexion par mot de passe n'étant pas possible, on fabrique
// directement l'en-tête de cookie à partir de la session obtenue.
const nomCookie = `sb-${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
const valeur = "base64-" + Buffer.from(JSON.stringify(session.session)).toString("base64url");
jar.set(nomCookie, valeur);
const cookie = `${nomCookie}=${valeur}`;

const resultats = [];
const verifier = (nom, ok, detail = "") => {
  resultats.push({ nom, ok: !!ok, detail });
  // Affichage immédiat : si le réseau lâche en cours de route, on sait déjà
  // ce qui avait été vérifié.
  console.log(`${ok ? "✅" : "❌"} ${nom}${detail ? `  (${detail})` : ""}`);
};

/** Le réseau peut lâcher une fois : on retente avant de conclure à un échec. */
async function page(chemin, essais = 3) {
  let derniere;
  for (let i = 0; i < essais; i += 1) {
    try {
      const r = await fetch(`${BASE}${chemin}`, { headers: { cookie }, redirect: "manual" });
      const corps = r.status === 200 ? await r.text() : "";
      return { statut: r.status, corps, emplacement: r.headers.get("location") ?? "" };
    } catch (e) {
      derniere = e;
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return { statut: 0, corps: "", emplacement: "", erreur: String(derniere?.message ?? derniere) };
}

console.log(`Site : ${BASE}`);
console.log(`Compte : ${EMAIL}\n`);

const accueil = await page("/");
verifier("accueil accessible", accueil.statut === 200, `HTTP ${accueil.statut}`);
verifier(
  "le parcours de démarrage s'affiche",
  /Pour démarrer/.test(accueil.corps),
  "",
);
verifier(
  "le parcours commence par les types de véhicules",
  /Créer vos types de véhicules/.test(accueil.corps),
  "",
);
verifier(
  "les étapes suivantes sont annoncées comme bloquées",
  /Commencez par les types de véhicules/.test(accueil.corps),
  "",
);

const catalogue = await page("/catalogue");
verifier("catalogue accessible", catalogue.statut === 200, `HTTP ${catalogue.statut}`);
verifier(
  "le catalogue invite à créer les types",
  /Aucun type de véhicule/.test(catalogue.corps),
  "",
);
verifier("la page de création des pièces est là", /Ajouter une pièce/.test(catalogue.corps), "");

const stock = await page("/stock");
verifier("la liste des sites s'affiche", stock.statut === 200 && /Garage Central/.test(stock.corps), `HTTP ${stock.statut}`);

const siteId = (await admin.from("sites").select("id").eq("nom", "Garage Central").single()).data?.id;
const detail = await page(`/stock/${siteId}`);
verifier("le détail d'un site vide s'affiche", detail.statut === 200 && /Aucune quantité enregistrée/.test(detail.corps), `HTTP ${detail.statut}`);

const vehicules = await page("/vehicules");
verifier(
  "les véhicules renvoient vers le catalogue (aucun type)",
  vehicules.statut === 200 && /Aucun type de véhicule au catalogue/.test(vehicules.corps),
  `HTTP ${vehicules.statut}`,
);

const bons = await page("/bons");
verifier(
  "les bons renvoient vers les véhicules (aucun véhicule)",
  bons.statut === 200 && /Aucun véhicule enregistré/.test(bons.corps),
  `HTTP ${bons.statut}`,
);

const comptes = await page("/admin/comptes");
verifier("la page Comptes reste accessible", comptes.statut === 200, `HTTP ${comptes.statut}`);

console.log("");
const echecs = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passées`);
process.exit(echecs.length ? 1 : 0);
