"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";

export async function ajouterDemande(formData: FormData) {
  const piece_id = Number(formData.get("piece_id"));
  const quantite = Number(formData.get("quantite"));
  const date_demande = formData.get("date_demande") as string;

  const vehicule_select = formData.get("vehicule_nom_select") as string;
  const vehicule_autre = formData.get("vehicule_nom_autre") as string;
  const vehicule_nom = vehicule_select === "AUTRE" ? vehicule_autre : vehicule_select;

  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) throw new Error("Non connecté.");

  // Les rôles à vue globale opèrent sur plusieurs sites : ils choisissent le site concerné.
  // Les rôles restreints à un site n'ont rien à choisir (déduit de leur compte).
  const site_id = aVueGlobale(utilisateur)
    ? Number(formData.get("site_id"))
    : utilisateur.site_id;

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("demandes_pieces").insert({
    piece_id,
    quantite,
    demandeur_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
    demandeur_id: utilisateur.id,
    site_id,
    statut: "en_attente",
    vehicule_nom,
    date_demande,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/bons");
  revalidatePath("/");
}

export async function mettreAJourStatut(id: number, statut: string) {
  const supabase = await supabaseServeur();
  const { error } = await supabase.from("demandes_pieces").update({ statut }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/bons");
  revalidatePath("/");
}
