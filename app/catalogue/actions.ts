"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";

export type EtatCatalogue = { erreur?: string; succes?: string } | undefined;

const RESERVE =
  "Action réservée aux rôles à vue globale (Chef Garage, Comptable Matières, Chef Service Technique).";

/**
 * Traduit une erreur PostgreSQL en message compréhensible.
 *
 * Les messages bruts de la base (« duplicate key value violates unique
 * constraint ») ne veulent rien dire pour un utilisateur de garage, et
 * n'indiquent pas quoi faire. Chaque cas courant a donc sa phrase.
 */
function messageErreur(error: { code?: string; message: string }): string {
  if (error.code === "23505" || /duplicate key|unique/i.test(error.message)) {
    return "Cette entrée existe déjà : une pièce du même nom est déjà enregistrée pour ce véhicule.";
  }
  if (error.code === "23503" || /foreign key/i.test(error.message)) {
    return "Impossible : cet élément est utilisé ailleurs (véhicule, stock ou historique). Retirez-le d'abord de ces endroits.";
  }
  if (error.code === "42501" || /row-level security|non autoris/i.test(error.message)) {
    return RESERVE;
  }
  if (error.code === "23502" || /null value/i.test(error.message)) {
    return "Un champ obligatoire est vide.";
  }
  if (error.code === "23514" || /check constraint/i.test(error.message)) {
    return "La valeur saisie est refusée par la base (format ou longueur inhabituelle).";
  }
  if (error.code === "PGRST301" || /JWT|token/i.test(error.message)) {
    return "Votre session a expiré. Reconnectez-vous, puis réessayez.";
  }
  console.error("Catalogue:", error.message);
  return "L'opération n'a pas pu être enregistrée. Réessayez dans un instant.";
}

async function verifierDroits(): Promise<string | null> {
  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return "Votre session a expiré. Reconnectez-vous.";
  if (!aVueGlobale(utilisateur)) return RESERVE;
  return null;
}

function rafraichir() {
  revalidatePath("/catalogue");
  revalidatePath("/stock");
  revalidatePath("/stock/[site]", "page");
  revalidatePath("/vehicules");
  revalidatePath("/bons");
  revalidatePath("/");
}

function texte(formData: FormData, champ: string): string {
  return ((formData.get(champ) as string) ?? "").trim();
}

// ============================================================================
//  TYPES DE VÉHICULES
// ============================================================================

export async function creerTypeVehicule(_etat: EtatCatalogue, formData: FormData): Promise<EtatCatalogue> {
  const refus = await verifierDroits();
  if (refus) return { erreur: refus };

  const nom = texte(formData, "nom");
  const marque = texte(formData, "marque") || null;

  if (!nom) return { erreur: "Le nom du type de véhicule est obligatoire." };
  if (nom.length > 80) return { erreur: "Le nom est trop long (80 caractères maximum)." };

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("types_vehicules").insert({ nom, marque });
  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: `Type « ${nom} » ajouté.` };
}

export async function majTypeVehicule(_etat: EtatCatalogue, formData: FormData): Promise<EtatCatalogue> {
  const refus = await verifierDroits();
  if (refus) return { erreur: refus };

  const id = Number(formData.get("id"));
  const nom = texte(formData, "nom");
  const marque = texte(formData, "marque") || null;

  if (!id) return { erreur: "Type introuvable." };
  if (!nom) return { erreur: "Le nom du type de véhicule est obligatoire." };

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("types_vehicules").update({ nom, marque }).eq("id", id);
  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: "Type mis à jour." };
}

export async function supprimerTypeVehicule(_etat: EtatCatalogue, formData: FormData): Promise<EtatCatalogue> {
  const refus = await verifierDroits();
  if (refus) return { erreur: refus };

  const id = Number(formData.get("id"));
  if (!id) return { erreur: "Type introuvable." };

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("types_vehicules").delete().eq("id", id);
  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: "Type supprimé." };
}

// ============================================================================
//  PIÈCES
// ============================================================================

/** Lit le type de véhicule du formulaire. Vide = pièce générique (lubrifiant…). */
function lireTypeVehicule(formData: FormData): number | null | undefined {
  const brut = formData.get("type_vehicule_id") as string | null;
  if (brut === null) return undefined; // champ absent : ne pas toucher
  if (brut === "") return null; // « Générique » choisi explicitement
  const n = Number(brut);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function creerPiece(_etat: EtatCatalogue, formData: FormData): Promise<EtatCatalogue> {
  const refus = await verifierDroits();
  if (refus) return { erreur: refus };

  const nom = texte(formData, "nom");
  const categorie = texte(formData, "categorie") || null;
  const reference = texte(formData, "reference") || null;
  const type_vehicule_id = lireTypeVehicule(formData);

  if (!nom) return { erreur: "Le nom de la pièce est obligatoire." };
  if (nom.length > 120) return { erreur: "Le nom est trop long (120 caractères maximum)." };

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("pieces").insert({
    nom,
    categorie,
    reference,
    type_vehicule_id: type_vehicule_id ?? null,
  });
  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: `Pièce « ${nom} » ajoutée au catalogue.` };
}

export async function majPiece(_etat: EtatCatalogue, formData: FormData): Promise<EtatCatalogue> {
  const refus = await verifierDroits();
  if (refus) return { erreur: refus };

  const id = Number(formData.get("id"));
  const nom = texte(formData, "nom");
  const categorie = texte(formData, "categorie") || null;
  const reference = texte(formData, "reference") || null;
  const type = lireTypeVehicule(formData);

  if (!id) return { erreur: "Pièce introuvable." };
  if (!nom) return { erreur: "Le nom de la pièce est obligatoire." };

  const supabase = await supabaseServeur();
  const { error } = await supabase
    .from("pieces")
    .update({
      nom,
      categorie,
      reference,
      ...(type === undefined ? {} : { type_vehicule_id: type }),
    })
    .eq("id", id);
  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: "Pièce mise à jour." };
}

export async function supprimerPiece(_etat: EtatCatalogue, formData: FormData): Promise<EtatCatalogue> {
  const refus = await verifierDroits();
  if (refus) return { erreur: refus };

  const id = Number(formData.get("id"));
  if (!id) return { erreur: "Pièce introuvable." };

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("pieces").delete().eq("id", id);
  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: "Pièce supprimée." };
}
