"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";

export type EtatVehicule = { erreur?: string; succes?: string } | undefined;

function rafraichir() {
  revalidatePath("/vehicules");
  revalidatePath("/stock");
  revalidatePath("/stock/[site]", "page");
  revalidatePath("/");
}

export async function ajouterVehicule(formData: FormData) {
  const immatriculation = (formData.get("immatriculation") as string)?.trim();
  const type_vehicule_id = Number(formData.get("type_vehicule_id"));
  const site_id = Number(formData.get("site_id"));

  if (!immatriculation || !type_vehicule_id || !site_id) {
    throw new Error("Immatriculation, type et site sont requis.");
  }

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("vehicules").insert({
    immatriculation,
    type_vehicule_id,
    site_id,
    statut: "arrive",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/vehicules");
  revalidatePath("/");
}

export async function changerStatutVehicule(id: number, statut: string) {
  const supabase = await supabaseServeur();
  const { error } = await supabase.from("vehicules").update({ statut }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/vehicules");
  revalidatePath("/");
}

/**
 * Déclare une pièce utilisée sur un véhicule.
 *
 * Passe par la fonction SQL `enregistrer_utilisation`, et non par une simple
 * insertion : c'est elle qui, dans la même transaction, écrit l'historique,
 * **décrémente le stock du site du véhicule** et journalise le mouvement.
 * C'est précisément ce décrément qui manquait — le stock ne bougeait jamais.
 *
 * Le stock peut devenir négatif : on ne bloque jamais une déclaration de
 * réparation réelle. Une quantité négative s'affiche en rouge dans le stock,
 * ce qui rend l'écart visible plutôt que de le masquer.
 */
export async function ajouterUtilisation(_etat: EtatVehicule, formData: FormData): Promise<EtatVehicule> {
  const vehicule_id = Number(formData.get("vehicule_id"));
  const piece_id = Number(formData.get("piece_id"));
  const quantite = Number(formData.get("quantite"));
  const date_utilisation = (formData.get("date_utilisation") as string) || null;

  if (!vehicule_id) return { erreur: "Choisissez le véhicule concerné." };
  if (!piece_id) return { erreur: "Choisissez la pièce utilisée." };
  if (!Number.isFinite(quantite) || quantite <= 0) {
    return { erreur: "La quantité doit être supérieure à zéro." };
  }

  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return { erreur: "Session expirée. Reconnectez-vous." };

  const nomComplet = `${utilisateur.prenom} ${utilisateur.nom}`;
  const supabase = await supabaseServeur();

  const { data: reste, error } = await supabase.rpc("enregistrer_utilisation", {
    p_vehicule_id: vehicule_id,
    p_piece_id: piece_id,
    p_quantite: quantite,
    p_date: date_utilisation,
    p_utilisateur_nom: nomComplet,
  });

  if (error) {
    if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
      return {
        erreur:
          "La base de données n'est pas à jour : la fonction de stock est absente. Appliquez supabase/migrations/20260921000001_securite_et_mouvements_stock.sql.",
      };
    }
    if (/non autoris/i.test(error.message)) {
      return { erreur: "Vous ne pouvez déclarer une pièce que sur un véhicule de votre site." };
    }
    console.error("enregistrer_utilisation:", error.message);
    return { erreur: "L'enregistrement a échoué. Réessayez dans un instant." };
  }

  rafraichir();
  const restant = typeof reste === "number" ? reste : Number(reste);
  return {
    succes: Number.isFinite(restant)
      ? `Enregistré. Stock restant sur le site : ${restant}.`
      : "Enregistré.",
  };
}
