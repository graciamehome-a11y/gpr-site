"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";

export type EtatCarburant = { erreur?: string; succes?: string } | undefined;

/**
 * Enregistre un ravitaillement ou une consommation.
 *
 * L'historique et le solde sont écrits par une seule fonction SQL, dans la même
 * transaction. Auparavant l'application insérait d'abord la ligne d'historique
 * puis appelait la mise à jour du solde : si ce second appel échouait,
 * l'historique affichait un mouvement qui n'avait jamais été appliqué — un
 * ravitaillement visible mais absent du solde.
 */
export async function ajouterMouvementCarburant(
  _etat: EtatCarburant,
  formData: FormData,
): Promise<EtatCarburant> {
  const site_id = Number(formData.get("site_id"));
  const type = formData.get("type") as string;
  const mouvement = formData.get("mouvement") as string;
  const quantite = Number(formData.get("quantite"));

  if (!site_id) return { erreur: "Détachement introuvable." };
  if (type !== "gasoil" && type !== "essence") return { erreur: "Type de carburant invalide." };
  if (mouvement !== "ravitaillement" && mouvement !== "consommation") {
    return { erreur: "Type de mouvement invalide." };
  }
  if (!Number.isFinite(quantite) || quantite <= 0) {
    return { erreur: "La quantité doit être supérieure à zéro." };
  }

  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return { erreur: "Session expirée. Reconnectez-vous." };

  const supabase = await supabaseServeur();
  const { data: solde, error } = await supabase.rpc("enregistrer_mouvement_carburant", {
    p_site_id: site_id,
    p_type: type,
    p_mouvement: mouvement,
    p_quantite: quantite,
    p_utilisateur_id: utilisateur.id,
  });

  if (error) {
    if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
      return {
        erreur:
          "La base de données n'est pas à jour : appliquez supabase/migrations/20260921000001_securite_et_mouvements_stock.sql.",
      };
    }
    if (/non autoris/i.test(error.message)) {
      return { erreur: "Vous n'avez pas accès au carburant de ce détachement." };
    }
    console.error("enregistrer_mouvement_carburant:", error.message);
    return { erreur: "Le mouvement n'a pas pu être enregistré. Réessayez dans un instant." };
  }

  revalidatePath("/carburant");
  revalidatePath("/");

  const reste = typeof solde === "number" ? solde : Number(solde);
  return {
    succes: Number.isFinite(reste)
      ? `Enregistré. Nouveau solde : ${reste.toLocaleString("fr-FR")} L.`
      : "Mouvement enregistré.",
  };
}
