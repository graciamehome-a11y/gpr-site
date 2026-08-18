"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function ajouterMouvementCarburant(formData: FormData) {
  const site_id = Number(formData.get("site_id"));
  const type = formData.get("type") as string;
  const mouvement = formData.get("mouvement") as string;
  const quantite = Number(formData.get("quantite"));
  const utilisateur_nom = formData.get("utilisateur_nom") as string;

  // 1. On enregistre l'événement dans l'historique
  const { error: errorMouvement } = await supabase
    .from("mouvements_carburant")
    .insert({
      site_id,
      type,
      mouvement,
      quantite_litres: quantite,
      utilisateur_id: null, // en attendant l'authentification
    });
  if (errorMouvement) throw new Error(errorMouvement.message);

  // 2. On va chercher le solde ACTUEL pour ce site + ce type
  const { data: stockActuel, error: errorLecture } = await supabase
    .from("carburant_stock")
    .select("id, quantite_litres")
    .eq("site_id", site_id)
    .eq("type", type)
    .single(); // .single() : on attend UNE SEULE ligne (grâce à la contrainte unique qu'on avait créée)

  if (errorLecture) throw new Error(errorLecture.message);

  // 3. On calcule le nouveau solde : + si ravitaillement, - si consommation
  const nouvelleQuantite =
    mouvement === "ravitaillement"
      ? stockActuel.quantite_litres + quantite
      : stockActuel.quantite_litres - quantite;

  // 4. On met à jour le solde
  const { error: errorMaj } = await supabase
    .from("carburant_stock")
    .update({ quantite_litres: nouvelleQuantite })
    .eq("id", stockActuel.id);

  if (errorMaj) throw new Error(errorMaj.message);

  revalidatePath("/carburant");
}
