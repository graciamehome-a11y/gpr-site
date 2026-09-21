/**
 * Test de sécurité — n'écrit aucune donnée métier.
 *
 * Vérifie si `ajuster_carburant_stock` — la fonction qui met à jour le solde de
 * carburant en contournant les RLS (SECURITY DEFINER) — est détournable par une
 * personne authentifiée SANS ligne dans `utilisateurs`, c'est-à-dire un compte
 * auto-inscrit (l'inscription libre est ouverte sur ce projet).
 *
 * Le test appelle la fonction avec un site INEXISTANT (999999) et un delta de 0 :
 * aucun solde réel ne peut être modifié, seule l'erreur remontée est observée.
 *   - « Non autorisé »        → garde-fou efficace
 *   - erreur de clé étrangère → garde-fou contourné (faille)
 *
 * Le compte de diagnostic est supprimé à la fin, quoi qu'il arrive.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `diag.securite.${Date.now()}@gmail.com`;
const motDePasse = "DiagPass123456!";

console.log("Cas testé : une personne connectée SANS ligne dans public.utilisateurs");
console.log("(exactement ce que produit l'inscription libre, qui est ouverte sur ce projet)\n");

// --- 0. Sans session du tout : la fonction est-elle accessible ? ---
const anonyme = createServerClient(url, anonKey, {
  cookies: { getAll: () => [], setAll: () => {} },
});
const { error: errAnon } = await anonyme.rpc("ajuster_carburant_stock", {
  p_site_id: 999999,
  p_type: "gasoil",
  p_delta: 0,
});
console.log("=== 0. Appel sans aucune session (visiteur anonyme) ===");
console.log(`  ${errAnon ? errAnon.message : "⚠️  appel accepté"}`);

// --- 1. Avec une session, mais aucun profil applicatif ---
const { data: creation, error: errCreation } = await admin.auth.admin.createUser({
  email,
  password: motDePasse,
  email_confirm: true,
});
if (errCreation) {
  console.error("création du compte de diagnostic impossible :", errCreation.message);
  process.exit(1);
}

try {
  const jar = new Map();
  const sessionne = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (liste) => liste.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error: errConnexion } = await sessionne.auth.signInWithPassword({
    email,
    password: motDePasse,
  });
  if (errConnexion) throw new Error(`connexion : ${errConnexion.message}`);
  console.log("\n✅ Session obtenue pour ce compte sans profil.");

  console.log("\n=== 1. Accès aux données métier (RLS) ===");
  for (const t of ["pieces", "stocks", "vehicules", "demandes_pieces", "utilisateurs", "carburant_stock"]) {
    const { count, error } = await sessionne.from(t).select("*", { count: "exact", head: true });
    console.log(`  ${t.padEnd(18)} ${error ? "❌ " + error.message : `${count} ligne(s) visibles`}`);
  }

  console.log("\n=== 2. Détournement de la fonction carburant (écriture hors RLS) ===");
  const { error } = await sessionne.rpc("ajuster_carburant_stock", {
    p_site_id: 999999,
    p_type: "gasoil",
    p_delta: 0,
  });
  const message = error?.message ?? "(aucune erreur)";
  console.log(`  Réponse brute : ${message}`);
  if (/non autoris/i.test(message)) {
    console.log("  ✅ Garde-fou actif : la fonction refuse l'appel.");
  } else {
    console.log(
      "  🔴 GARDE-FOU CONTOURNÉ : la fonction s'exécute pour un compte sans profil.\n" +
        "     Ici l'écriture s'arrête uniquement parce que le site 999999 n'existe pas.\n" +
        "     Avec un identifiant de site réel, le solde de carburant serait modifié\n" +
        "     sans aucun contrôle de rôle ni de site.",
    );
  }
} finally {
  await admin.auth.admin.deleteUser(creation.user.id);
  console.log(`\n(nettoyage : compte ${email} supprimé)`);
}
