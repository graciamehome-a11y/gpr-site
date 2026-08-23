"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";

export async function ajouterMouvementCarburant(formData: FormData) {
  const site_id = Number(formData.get("site_id"));
  const type = formData.get("type") as string;
  const mouvement = formData.get("mouvement") as string;
  const quantite = Number(formData.get("quantite"));

  if (!site_id || !type || !mouvement || !quantite || quantite <= 0) {
    throw new Error("Champs invalides.");
  }

  const utilisateur = await getUtilisateurConnecte();
  const supabase = await supabaseServeur();

  // 1. Historique du mouvement
  const { error: errorMouvement } = await supabase.from("mouvements_carburant").insert({
    site_id,
    type,
    mouvement,
    quantite_litres: quantite,
    utilisateur_id: utilisateur?.id ?? null,
  });
  if (errorMouvement) throw new Error(errorMouvement.message);

  // 2. Mise à jour atomique du solde côté base (fonction ajuster_carburant_stock,
  //    évite la race condition d'un read-then-write fait depuis Next.js — cf. AUDIT.md §3.5)
  const delta = mouvement === "ravitaillement" ? quantite : -quantite;
  const { error: errorAjustement } = await supabase.rpc("ajuster_carburant_stock", {
    p_site_id: site_id,
    p_type: type,
    p_delta: delta,
  });
  if (errorAjustement) throw new Error(errorAjustement.message);

  revalidatePath("/carburant");
}
