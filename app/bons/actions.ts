"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { libelleVehicule } from "@/lib/libelles";

export type EtatBon = { erreur?: string; succes?: string } | undefined;

type VehiculeChoisi = {
  id: number;
  immatriculation: string;
  site_id: number;
  types_vehicules: { nom: string } | null;
};

/**
 * Enregistre une demande de pièce.
 *
 * Le véhicule est désormais choisi parmi les véhicules réellement enregistrés
 * (immatriculation + type), et non plus saisi comme un simple texte : le bon
 * renvoie à une fiche véhicule, comme demandé.
 *
 * Le site du bon est **déduit du véhicule** au lieu d'être redemandé. Un rôle à
 * vue globale pouvait auparavant choisir un véhicule de D1 Nikki tout en
 * déclarant le bon sur D2 Bessassi, ce qui produisait une ligne incohérente —
 * or le cahier des charges pose qu'un véhicule est localisé à un seul site.
 */
export async function ajouterDemande(_etat: EtatBon, formData: FormData): Promise<EtatBon> {
  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return { erreur: "Session expirée. Reconnectez-vous." };

  const piece_id = Number(formData.get("piece_id"));
  const vehicule_id = Number(formData.get("vehicule_id"));
  const quantite = Number(formData.get("quantite"));
  const date_demande =
    (formData.get("date_demande") as string) || new Date().toISOString().slice(0, 10);

  if (!vehicule_id) return { erreur: "Choisissez le véhicule concerné." };
  if (!piece_id) return { erreur: "Choisissez la pièce demandée." };
  if (!Number.isFinite(quantite) || quantite <= 0) {
    return { erreur: "La quantité doit être supérieure à zéro." };
  }

  const supabase = await supabaseServeur();

  const { data: vehicule, error: erreurVehicule } = await supabase
    .from("vehicules")
    .select("id, immatriculation, site_id, types_vehicules(nom)")
    .eq("id", vehicule_id)
    .maybeSingle<VehiculeChoisi>();

  if (erreurVehicule || !vehicule) {
    return { erreur: "Ce véhicule est introuvable, ou il ne dépend pas de votre site." };
  }

  const { error } = await supabase.from("demandes_pieces").insert({
    piece_id,
    quantite,
    vehicule_id: vehicule.id,
    // Conservé en clair pour l'affichage et pour les bons créés avant ce
    // changement, qui n'ont pas de vehicule_id.
    vehicule_nom: libelleVehicule(vehicule),
    demandeur_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
    demandeur_id: utilisateur.id,
    site_id: vehicule.site_id,
    statut: "en_attente",
    date_demande,
  });

  if (error) {
    console.error("ajouterDemande:", error.message);
    return { erreur: "La demande n'a pas pu être enregistrée. Réessayez dans un instant." };
  }

  revalidatePath("/bons");
  revalidatePath("/");
  return { succes: "Demande enregistrée." };
}

export async function mettreAJourStatut(id: number, statut: string) {
  const supabase = await supabaseServeur();
  const { error } = await supabase.from("demandes_pieces").update({ statut }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/bons");
  revalidatePath("/");
}
