/**
 * Test décisif : un compte créé à l'instant peut-il se connecter tout de suite,
 * sans qu'aucun email ne soit envoyé ?
 *
 * C'est exactement le scénario qui était impossible pour les clients :
 * l'invitation par email n'arrivait jamais, donc personne ne pouvait définir de
 * mot de passe. On reproduit ici les opérations de `creerCompte`
 * (app/admin/comptes/actions.ts), puis la connexion de `app/login/actions.ts`.
 *
 * Le compte de test est supprimé à la fin, quoi qu'il arrive.
 *
 * Usage : URL_APP=https://garage-gracia.vercel.app node scripts/tester-creation-compte.mjs
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

// Alphabet identique à lib/motDePasse.ts (sans caractères ambigus).
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function motDePasseTemporaire() {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return Array.from(octets)
    .map((o) => ALPHABET[o % ALPHABET.length])
    .join("")
    .match(/.{1,4}/g)
    .join("-");
}

const email = `test.creation.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@gmail.com`;
const motDePasse = motDePasseTemporaire();
const resultats = [];
const verifier = (nom, ok, detail = "") => resultats.push({ nom, ok: !!ok, detail });

console.log(`Site testé : ${BASE}`);
console.log(`Compte de test : ${email}\n`);

let idAuth = null;
let idProfil = null;

try {
  // ---------------------------------------------------- 1. Création (creerCompte)
  const { data: role } = await admin.from("roles").select("id").eq("nom", "technicien").single();
  const { data: site } = await admin.from("sites").select("id").eq("nom", "D1 Nikki").single();

  const { data: creation, error: errCreation } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true, // le compte est utilisable sans confirmation par email
  });
  verifier("création du compte de connexion", !errCreation && !!creation?.user, errCreation?.message);
  if (!creation?.user) throw new Error("création impossible, arrêt du test");
  idAuth = creation.user.id;

  const { data: profil, error: errProfil } = await admin
    .from("utilisateurs")
    .insert({
      auth_id: idAuth,
      nom: "Test",
      prenom: "Création",
      email,
      role_id: role.id,
      site_id: site.id,
      // Comme dans app/admin/comptes/actions.ts : le mot de passe provisoire
      // devra être remplacé par la personne elle-même.
      doit_changer_mot_de_passe: true,
    })
    .select("id")
    .single();
  verifier("fiche applicative créée (rôle + site)", !errProfil && !!profil?.id, errProfil?.message);
  if (profil) idProfil = profil.id;

  // ------------------------------------- 2. Connexion (app/login/actions.ts)
  const jar = new Map();
  const testeur = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (liste) => liste.forEach(({ name, value }) => jar.set(name, value)),
    },
  });

  const { data: connexion, error: errConnexion } = await testeur.auth.signInWithPassword({
    email,
    password: motDePasse,
  });
  verifier(
    "connexion immédiate avec le mot de passe affiché, sans email",
    !errConnexion && !!connexion?.session,
    errConnexion?.message,
  );

  const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");

  // --------------------------------- 3. Le profil est bien résolu par l'appli
  const { data: moi, error: errMoi } = await testeur
    .from("utilisateurs")
    .select("id, nom, prenom, roles(nom), sites(nom)")
    .eq("auth_id", idAuth)
    .single();
  verifier(
    "l'application identifie la personne (rôle et site)",
    !errMoi && !!(moi && moi.roles && moi.sites),
    errMoi?.message ?? `${moi?.prenom} ${moi?.nom}`,
  );

  // ------------------- 4. Le mot de passe provisoire doit être changé
  // La personne vient d'entrer avec le mot de passe créé par l'administrateur,
  // qui le connaît : l'application doit l'obliger à en choisir un personnel
  // avant de la laisser utiliser quoi que ce soit.
  const garde = await fetch(`${BASE}/stock`, { headers: { cookie }, redirect: "manual" });
  const emplacement = garde.headers.get("location") ?? "";
  verifier(
    "l'application force le choix d'un mot de passe personnel",
    garde.status === 307 && emplacement.includes("/mot-de-passe") && emplacement.includes("premier=1"),
    `${garde.status} → ${emplacement}`,
  );

  const pageMotDePasse = await fetch(`${BASE}/mot-de-passe?premier=1`, {
    headers: { cookie },
    redirect: "manual",
  });
  const corpsMotDePasse = pageMotDePasse.status === 200 ? await pageMotDePasse.text() : "";
  verifier(
    "la page de choix reste accessible (pas de boucle de redirection)",
    pageMotDePasse.status === 200 && /provisoire/i.test(corpsMotDePasse),
    `HTTP ${pageMotDePasse.status}`,
  );

  // ------------------------------- 5. Changement de mot de passe (page dédiée)
  const nouveau = motDePasseTemporaire();
  const { error: errChangement } = await testeur.auth.updateUser({ password: nouveau });
  verifier("changement de mot de passe depuis « Mon mot de passe »", !errChangement, errChangement?.message);

  const { error: errDrapeau } = await testeur.rpc("marquer_mot_de_passe_personnel");
  verifier("le mot de passe est marqué comme personnel", !errDrapeau, errDrapeau?.message);

  // ------------- 6. Une fois le mot de passe personnel choisi, tout s'ouvre
  const accueil = await fetch(`${BASE}/`, { headers: { cookie }, redirect: "manual" });
  const corpsAccueil = accueil.status === 200 ? await accueil.text() : "";
  verifier(
    "l'accès est débloqué après le changement",
    accueil.status === 200 && corpsAccueil.includes("Bonjour"),
    `HTTP ${accueil.status}`,
  );

  const stock = await fetch(`${BASE}/stock`, { headers: { cookie }, redirect: "manual" });
  const corpsStock = stock.status === 200 ? await stock.text() : "";
  verifier(
    "le technicien ne voit que son site",
    stock.status === 200 && corpsStock.includes("D1 Nikki") && !corpsStock.includes("D2 Bessassi"),
    `HTTP ${stock.status}`,
  );

  const autreSite = await fetch(`${BASE}/stock/3`, { headers: { cookie }, redirect: "manual" });
  verifier("le site d'un autre reste interdit (404)", autreSite.status === 404, `HTTP ${autreSite.status}`);

  const jar2 = new Map();
  const testeur2 = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar2.entries()].map(([name, value]) => ({ name, value })),
      setAll: (liste) => liste.forEach(({ name, value }) => jar2.set(name, value)),
    },
  });
  const { error: errReconnexion } = await testeur2.auth.signInWithPassword({
    email,
    password: nouveau,
  });
  verifier("reconnexion avec le nouveau mot de passe", !errReconnexion, errReconnexion?.message);
} catch (e) {
  verifier("déroulement du test", false, String(e.message ?? e));
} finally {
  console.log("");
  if (idProfil) await admin.from("utilisateurs").delete().eq("id", idProfil);
  if (idAuth) await admin.auth.admin.deleteUser(idAuth);
  console.log(`(nettoyage : compte de test supprimé)\n`);
}

for (const r of resultats) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.nom}${r.detail ? `  (${r.detail})` : ""}`);
}
const echecs = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passées`);
process.exit(echecs.length ? 1 : 0);
