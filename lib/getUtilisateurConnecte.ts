import "server-only";
import { supabaseServeur } from "./supabaseServerClient";

export type UtilisateurConnecte = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  site_id: number | null;
  site_nom: string | null;
  /**
   * Vrai tant que la personne utilise le mot de passe temporaire transmis par
   * l'administrateur. L'application la force alors à en choisir un elle-même.
   */
  doit_changer_mot_de_passe: boolean;
};

const ROLES_VUE_GLOBALE = [
  "chef_garage",
  "comptable_matieres",
  "chef_service_technique",
];

/**
 * Récupère l'identité applicative (rôle, site) de la personne connectée.
 * Retourne `null` si personne n'est connecté — le proxy protège déjà les
 * routes, mais chaque page/action doit rester capable de gérer ce cas.
 */
export async function getUtilisateurConnecte(): Promise<UtilisateurConnecte | null> {
  const supabase = await supabaseServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("utilisateurs")
    .select("id, nom, prenom, email, role_id, site_id, doit_changer_mot_de_passe, roles(nom), sites(nom)")
    .eq("auth_id", user.id)
    .single<{
      id: number;
      nom: string;
      prenom: string;
      email: string;
      role_id: number;
      site_id: number | null;
      doit_changer_mot_de_passe: boolean;
      roles: { nom: string } | null;
      sites: { nom: string } | null;
    }>();

  if (error || !data) return null;

  return {
    id: data.id,
    nom: data.nom,
    prenom: data.prenom,
    email: data.email,
    role: data.roles?.nom ?? "",
    site_id: data.site_id,
    site_nom: data.sites?.nom ?? null,
    doit_changer_mot_de_passe: data.doit_changer_mot_de_passe ?? false,
  };
}

export function aVueGlobale(utilisateur: UtilisateurConnecte | null) {
  return !!utilisateur && ROLES_VUE_GLOBALE.includes(utilisateur.role);
}

export function accesCarburant(utilisateur: UtilisateurConnecte | null) {
  if (!utilisateur) return false;
  return ["technicien", "chef_detachement", "chef_service_technique"].includes(
    utilisateur.role,
  );
}
