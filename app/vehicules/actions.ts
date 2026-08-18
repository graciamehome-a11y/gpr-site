"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export async function ajouterVehicule(formData: FormData) {
  const immatriculation = formData.get("immatriculation") as string;
  const type_vehicule_id = Number(formData.get("type_vehicule_id"));
  const site_id = Number(formData.get("site_id"));

  const { error } = await supabase.from("vehicules").insert({
    immatriculation,
    type_vehicule_id,
    site_id,
    statut: "arrive",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/vehicules");
}

export async function ajouterUtilisation(formData: FormData) {
  const vehicule_id = Number(formData.get("vehicule_id"));
  const piece_id = Number(formData.get("piece_id"));
  const quantite = Number(formData.get("quantite"));
  const date_utilisation = formData.get("date_utilisation") as string;
  const utilisateur_nom = formData.get("utilisateur_nom") as string;

  const { error } = await supabase.from("pieces_utilisees").insert({
    vehicule_id,
    piece_id,
    quantite,
    date_utilisation,
    utilisateur_nom,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/vehicules");
}
