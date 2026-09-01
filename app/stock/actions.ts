"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";

export async function definirStock(formData: FormData) {
  const piece_id = Number(formData.get("piece_id"));
  const site_id = Number(formData.get("site_id"));
  const quantite = Number(formData.get("quantite"));
  const seuil_alerte = Number(formData.get("seuil_alerte") || 0);

  if (!piece_id || !site_id || Number.isNaN(quantite)) {
    throw new Error("Pièce, site et quantité sont requis.");
  }

  const supabase = await supabaseServeur();
  const { error } = await supabase
    .from("stocks")
    .upsert(
      { piece_id, site_id, quantite, seuil_alerte },
      { onConflict: "piece_id,site_id" },
    );

  if (error) throw new Error(error.message);
  revalidatePath("/stock");
  revalidatePath("/");
}
