/**
 * Test de bout en bout de l'application — nécessite qu'elle tourne.
 *
 *   1. npm run build
 *   2. npx next start -p 3100
 *   3. node scripts/tester-app.mjs
 *
 * Se connecte réellement (via @supabase/ssr, comme l'application), puis
 * parcourt chaque page avec la session obtenue et vérifie le code HTTP et
 * quelques contenus attendus. Lecture seule : aucune donnée n'est écrite.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.URL_APP || "http://localhost:3100";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const resultats = [];
function verifier(nom, condition, detail = "") {
  resultats.push({ nom, ok: !!condition, detail });
}

async function sessionPour(email, motDePasse) {
  const jar = new Map();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (liste) => liste.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
  if (error) throw new Error(`connexion ${email} : ${error.message}`);
  const cookie = [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  return { cookie, supabase };
}

async function page(chemin, cookie) {
  const reponse = await fetch(`${BASE}${chemin}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const corps = reponse.status === 200 ? await reponse.text() : "";
  return { statut: reponse.status, corps, emplacement: reponse.headers.get("location") };
}

// ------------------------------------------------------------------ anonyme
console.log("=== Visiteur non connecté ===");
{
  const racine = await page("/");
  verifier("/ redirige vers /login", racine.statut === 307 && /\/login/.test(racine.emplacement ?? ""), `${racine.statut} ${racine.emplacement}`);

  const oubli = await page("/mot-de-passe-oublie");
  verifier(
    "/mot-de-passe-oublie explique la démarche, sans formulaire trompeur",
    oubli.statut === 200 &&
      oubli.corps.includes("Mot de passe oublié") &&
      /init(ialiser|ialiser) le mot de passe/i.test(oubli.corps) &&
      !oubli.corps.includes('type="email"'),
    `HTTP ${oubli.statut}`,
  );

  const mdp = await page("/mot-de-passe");
  verifier("/mot-de-passe accessible sans session (lien à session en fragment)", mdp.statut === 200, `HTTP ${mdp.statut}`);

  const confirmSansParams = await page("/auth/confirm");
  verifier(
    "/auth/confirm sans jeton renvoie vers /login?erreur=lien-invalide",
    confirmSansParams.statut === 307 && /erreur=lien-invalide/.test(confirmSansParams.emplacement ?? ""),
    `${confirmSansParams.statut} ${confirmSansParams.emplacement}`,
  );

  const stockAnonyme = await page("/stock");
  verifier("/stock inaccessible sans session", stockAnonyme.statut === 307, `HTTP ${stockAnonyme.statut}`);
}

// ------------------------------------------------------------------ technicien
console.log("\n=== Technicien (D1 Nikki) ===");
{
  const { cookie } = await sessionPour("technicien@test.local", "Test1234!");
  const { data: sites } = await admin.from("sites").select("id, nom").order("id");
  const d1 = sites.find((s) => s.nom.includes("Nikki"));
  const autre = sites.find((s) => !s.nom.includes("Nikki"));

  const accueil = await page("/", cookie);
  verifier("accueil rendu", accueil.statut === 200 && accueil.corps.includes("Bonjour"), `HTTP ${accueil.statut}`);

  const stock = await page("/stock", cookie);
  verifier("/stock rendu", stock.statut === 200, `HTTP ${stock.statut}`);
  verifier("/stock ne montre que son site", stock.corps.includes(d1.nom) && !stock.corps.includes(autre.nom), `contient ${d1.nom}=${stock.corps.includes(d1.nom)}, ${autre.nom}=${stock.corps.includes(autre.nom)}`);

  const sonSite = await page(`/stock/${d1.id}`, cookie);
  verifier("son propre site accessible", sonSite.statut === 200, `HTTP ${sonSite.statut}`);
  verifier(
    "les pièces affichent leur type de véhicule",
    /— (Générique|[A-Z][A-Za-z0-9 -]+)/.test(sonSite.corps),
    "",
  );

  const siteInterdit = await page(`/stock/${autre.id}`, cookie);
  verifier("site d'un autre refusé (404)", siteInterdit.statut === 404, `HTTP ${siteInterdit.statut}`);

  const bons = await page("/bons", cookie);
  verifier("/bons rendu", bons.statut === 200, `HTTP ${bons.statut}`);

  const vehicules = await page("/vehicules", cookie);
  verifier("/vehicules rendu", vehicules.statut === 200, `HTTP ${vehicules.statut}`);

  const comptes = await page("/admin/comptes", cookie);
  verifier("comptes refusé pour un technicien", comptes.statut === 307, `HTTP ${comptes.statut} ${comptes.emplacement}`);
}

// ------------------------------------------------------------- chef garage
console.log("\n=== Chef Garage (vue globale) ===");
{
  const { cookie } = await sessionPour("chef.garage@test.local", "Test1234!");
  const { data: sites } = await admin.from("sites").select("id, nom").order("id");

  const stock = await page("/stock", cookie);
  verifier("/stock rendu", stock.statut === 200, `HTTP ${stock.statut}`);
  verifier("/stock liste les 4 sites", sites.every((s) => stock.corps.includes(s.nom)), sites.map((s) => `${s.nom}=${stock.corps.includes(s.nom)}`).join(" "));

  for (const site of sites) {
    const detail = await page(`/stock/${site.id}`, cookie);
    verifier(`/stock/${site.id} (${site.nom}) rendu`, detail.statut === 200, `HTTP ${detail.statut}`);
    verifier(
      `  → le catalogue complet est présent`,
      detail.corps.includes("Tout le catalogue"),
      "",
    );
  }

  const bons = await page("/bons", cookie);
  verifier("/bons rendu", bons.statut === 200, `HTTP ${bons.statut}`);
  verifier(
    "le formulaire de bon propose les véhicules réels (immatriculation)",
    /<option|ChampRecherche|Immatriculation/.test(bons.corps),
    "",
  );

  const comptes = await page("/admin/comptes", cookie);
  verifier("/admin/comptes rendu", comptes.statut === 200, `HTTP ${comptes.statut}`);
  verifier(
    "la page Comptes explique le mot de passe temporaire",
    /mot de passe temporaire/i.test(comptes.corps),
    "",
  );
  verifier(
    "le bouton de réinitialisation est présent",
    /initialiser le mot de passe/i.test(comptes.corps),
    "",
  );

  const carburant = await page("/carburant", cookie);
  verifier(
    "carburant : le Chef Garage est explicitement écarté, sans formulaire",
    carburant.statut === 200 &&
      carburant.corps.includes("ne concerne pas votre rôle") &&
      !carburant.corps.includes("Nouveau mouvement"),
    `HTTP ${carburant.statut}`,
  );
}


// --------------------------------------------------- explications à l'écran
// Chaque page métier doit dire à quoi elle sert : le client est non technique,
// et une règle non expliquée devient une question au téléphone.
console.log("\n=== Explications affichées dans l'interface ===");
{
  const { cookie } = await sessionPour("chef.garage@test.local", "Test1234!");
  const { data: sites } = await admin.from("sites").select("id").order("id");

  const attendus = [
    ["/stock", "Comment ça marche ?", "le stock est rangé par site"],
    [`/stock/${sites[0].id}`, "Comment lire cette page ?", "quantité, seuil, négatif, non suivi"],
    ["/bons", "À quoi sert ce registre ?", "le site découle du véhicule"],
    ["/vehicules", "À quoi sert cette page ?", "la pièce utilisée décompte le stock"],
    ["/admin/comptes", "Créer un compte : la marche à suivre", "le mot de passe temporaire"],
  ];

  for (const [chemin, titre, resume] of attendus) {
    const { statut, corps } = await page(chemin, cookie);
    verifier(`${chemin} — explication « ${titre} »`, statut === 200 && corps.includes(titre), resume);
  }
}

// ------------------------------------------- signatures RPC de l'application
// Vérifie que les noms de paramètres utilisés par le code atteignent bien les
// fonctions SQL. Chaque appel est choisi pour échouer AVANT toute écriture :
// une erreur métier (« Quantité invalide ») prouve que la fonction a été
// trouvée ; l'erreur PGRST202 signalerait au contraire que PostgREST ne
// reconnaît pas la fonction avec ces paramètres.
console.log("\n=== Signatures des fonctions appelées par l'application ===");
{
  const { supabase } = await sessionPour("chef.garage@test.local", "Test1234!");
  const cas = [
    ["enregistrer_utilisation", { p_vehicule_id: 1, p_piece_id: 1, p_quantite: 0, p_date: null, p_utilisateur_nom: "test" }, /invalide/i],
    ["transferer_stock", { p_piece_id: 1, p_site_source: 1, p_site_destination: 1, p_quantite: 1, p_utilisateur_nom: "test" }, /identiques/i],
    ["ajuster_stock", { p_piece_id: 999999999, p_site_id: 1, p_nouvelle_quantite: 0, p_seuil_alerte: null, p_motif: "test", p_utilisateur_nom: "test" }, /étrang|foreign/i],
    ["enregistrer_mouvement_carburant", { p_site_id: 1, p_type: "gazole", p_mouvement: "ravitaillement", p_quantite: 1, p_utilisateur_id: null }, /invalide/i],
  ];
  for (const [nom, args, motif] of cas) {
    const { error } = await supabase.rpc(nom, args);
    const introuvable = !!error && (error.code === "PGRST202" || /could not find the function/i.test(error.message));
    verifier(
      `${nom} : signature reconnue, refus avant écriture`,
      !!error && !introuvable && motif.test(error.message),
      error ? `${error.code ?? ""} ${error.message}`.slice(0, 80) : "AUCUNE erreur — écriture possible !",
    );
  }
}

// ------------------------------------------------------------------ bilan
console.log("");
for (const r of resultats) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.nom}${r.detail ? `  (${r.detail})` : ""}`);
}
const echecs = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passées`);
process.exit(echecs.length ? 1 : 0);
