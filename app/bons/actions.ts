"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function ajouterDemande(formData: FormData) {
  const piece_id = Number(formData.get("piece_id"));
  const quantite = Number(formData.get("quantite"));
  const demandeur_nom = formData.get("demandeur_nom") as string;
  const statut = formData.get("statut") as string;
  const date_demande = formData.get("date_demande") as string;

  const vehicule_select = formData.get("vehicule_nom_select") as string;
  const vehicule_autre = formData.get("vehicule_nom_autre") as string;
  const vehicule_nom =
    vehicule_select === "AUTRE" ? vehicule_autre : vehicule_select;

  const { error } = await supabase.from("demandes_pieces").insert({
    piece_id,
    quantite,
    demandeur_nom,
    statut,
    vehicule_nom,
    date_demande,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/bons");
}

export async function mettreAJourStatut(formData: FormData) {
  const id = Number(formData.get("id"));
  const statut = formData.get("statut") as string;

  const { error } = await supabase
    .from("demandes_pieces")
    .update({ statut })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/bons");
}
