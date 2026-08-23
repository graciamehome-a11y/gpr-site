"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";

export async function creerCompte(formData: FormData) {
  const demandeur = await getUtilisateurConnecte();
  if (!aVueGlobale(demandeur)) {
    throw new Error("Non autorisé : réservé aux rôles à vue globale.");
  }

  const email = (formData.get("email") as string)?.trim();
  const nom = (formData.get("nom") as string)?.trim();
  const prenom = (formData.get("prenom") as string)?.trim();
  const role_id = Number(formData.get("role_id"));
  const site_id_brut = formData.get("site_id") as string;
  const site_id = site_id_brut ? Number(site_id_brut) : null;

  if (!email || !nom || !prenom || !role_id) {
    throw new Error("Email, nom, prénom et rôle sont requis.");
  }

  // 1. Crée le compte d'authentification et envoie l'invitation par email
  //    (nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local)
  const { data, error: errorAuth } = await supabaseAdmin().auth.admin.inviteUserByEmail(email);
  if (errorAuth || !data.user) {
    throw new Error(errorAuth?.message ?? "Échec de la création du compte.");
  }

  // 2. Lie ce compte à la ligne applicative (rôle, site)
  const supabase = await supabaseServeur();
  const { error: errorProfil } = await supabase.from("utilisateurs").insert({
    auth_id: data.user.id,
    nom,
    prenom,
    email,
    role_id,
    site_id,
  });

  if (errorProfil) {
    // Le compte auth existe mais pas la ligne applicative : à nettoyer manuellement
    // dans le dashboard Supabase si cette erreur survient.
    throw new Error(errorProfil.message);
  }

  revalidatePath("/admin/comptes");
}
