"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";

export type EtatVehicule = { erreur?: string; succes?: string } | undefined;

// Un fichier "use server" ne peut exporter que des fonctions : cette liste
// reste donc locale. C'est la seule source de vérité côté serveur pour
// refuser un statut inventé.
const STATUTS_VEHICULE = ["arrive", "en_reparation", "transfere", "pret"] as const;

/** Traduit une erreur PostgreSQL en message compréhensible pour l'utilisateur. */
function messageErreur(error: { code?: string; message: string }): string {
  if (error.code === "23505" || /duplicate key|unique/i.test(error.message)) {
    return "Un véhicule porte déjà cette immatriculation. Vérifiez la plaque saisie.";
  }
  if (error.code === "23503" || /foreign key/i.test(error.message)) {
    return "Le type de véhicule choisi n'existe plus. Rechargez la page et réessayez.";
  }
  if (error.code === "42501" || /row-level security|non autoris/i.test(error.message)) {
    return "Vous n'avez pas le droit d'agir sur ce véhicule : il dépend d'un autre site.";
  }
  if (error.code === "23502" || /null value/i.test(error.message)) {
    return "Un champ obligatoire est vide (immatriculation, type ou site).";
  }
  if (/JWT|token|session/i.test(error.message)) {
    return "Votre session a expiré. Reconnectez-vous, puis réessayez.";
  }
  console.error("Action véhicule:", error.message);
  return "L'opération n'a pas pu être enregistrée. Réessayez dans un instant.";
}

function rafraichir() {
  revalidatePath("/vehicules");
  revalidatePath("/stock");
  revalidatePath("/stock/[site]", "page");
  revalidatePath("/");
}

export async function ajouterVehicule(_etat: EtatVehicule, formData: FormData): Promise<EtatVehicule> {
  const immatriculation = ((formData.get("immatriculation") as string) ?? "").trim();
  const type_vehicule_id = Number(formData.get("type_vehicule_id"));
  const site_id = Number(formData.get("site_id"));

  if (!immatriculation) return { erreur: "L'immatriculation est obligatoire." };
  if (immatriculation.length > 40) return { erreur: "Cette immatriculation est trop longue." };
  if (!type_vehicule_id) {
    return {
      erreur:
        "Choisissez le type de véhicule. S'il n'existe pas encore, ajoutez-le d'abord dans le Catalogue.",
    };
  }
  if (!site_id) return { erreur: "Site introuvable. Rechargez la page et réessayez." };

  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return { erreur: "Votre session a expiré. Reconnectez-vous." };

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("vehicules").insert({
    immatriculation,
    type_vehicule_id,
    site_id,
    statut: "arrive",
  });

  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: `Véhicule ${immatriculation} enregistré.` };
}

export async function changerStatutVehicule(
  _etat: EtatVehicule,
  formData: FormData,
): Promise<EtatVehicule> {
  const id = Number(formData.get("id"));
  const statut = formData.get("statut") as string;

  if (!id) return { erreur: "Véhicule introuvable." };
  if (!STATUTS_VEHICULE.includes(statut as (typeof STATUTS_VEHICULE)[number])) {
    return { erreur: "Statut inconnu." };
  }

  const supabase = await supabaseServeur();
  const { error } = await supabase.from("vehicules").update({ statut }).eq("id", id);
  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: "Statut mis à jour." };
}

/**
 * Déclare une pièce utilisée sur un véhicule.
 *
 * Passe par la fonction SQL `enregistrer_utilisation`, et non par une simple
 * insertion : c'est elle qui, dans la même transaction, écrit l'historique,
 * **décrémente le stock du site du véhicule** et journalise le mouvement.
 *
 * Le stock peut devenir négatif : on ne bloque jamais une déclaration de
 * réparation réelle. Une quantité négative s'affiche en rouge dans le stock,
 * ce qui rend l'écart visible plutôt que de le masquer.
 */
export async function ajouterUtilisation(
  _etat: EtatVehicule,
  formData: FormData,
): Promise<EtatVehicule> {
  const vehicule_id = Number(formData.get("vehicule_id"));
  const piece_id = Number(formData.get("piece_id"));
  const quantite = Number(formData.get("quantite"));
  const date_utilisation = (formData.get("date_utilisation") as string) || null;

  if (!vehicule_id) return { erreur: "Choisissez le véhicule concerné." };
  if (!piece_id) {
    return {
      erreur:
        "Choisissez la pièce utilisée. Si elle n'est pas dans la liste, ajoutez-la d'abord au Catalogue.",
    };
  }
  if (!Number.isFinite(quantite) || quantite <= 0) {
    return { erreur: "La quantité doit être un nombre supérieur à zéro." };
  }

  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return { erreur: "Votre session a expiré. Reconnectez-vous." };

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
          "La base de données n'est pas à jour : la fonction de stock est absente. Signalez-le à l'administrateur.",
      };
    }
    if (/non autoris/i.test(error.message)) {
      return { erreur: "Vous ne pouvez déclarer une pièce que sur un véhicule de votre site." };
    }
    return { erreur: messageErreur(error) };
  }

  rafraichir();
  const restant = typeof reste === "number" ? reste : Number(reste);
  return {
    succes: Number.isFinite(restant)
      ? `Enregistré. Stock restant sur le site : ${restant}.`
      : "Pièce enregistrée.",
  };
}
