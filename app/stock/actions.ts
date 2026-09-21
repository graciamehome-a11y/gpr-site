"use server";

import { revalidatePath } from "next/cache";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";

export type EtatStock = { erreur?: string; succes?: string } | undefined;

/** Trace d'une erreur technique sans exposer le détail SQL à l'écran. */
function messageErreur(error: { message: string; code?: string } | null): string {
  if (!error) return "L'opération n'a pas pu être enregistrée.";

  // La migration n'a pas encore été appliquée sur cette base.
  if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
    return "La base de données n'est pas à jour : la fonction de stock est absente. Appliquez supabase/migrations/20260921000001_securite_et_mouvements_stock.sql.";
  }
  if (/non autoris/i.test(error.message)) {
    return "Vous n'avez pas les droits sur ce site.";
  }
  if (/invalide|invalid/i.test(error.message)) {
    return "Valeur invalide : vérifiez la quantité saisie.";
  }
  if (/same|identiques/i.test(error.message)) {
    return "Le site de départ et le site d'arrivée doivent être différents.";
  }
  console.error("Action stock:", error.message);
  return "L'opération n'a pas pu être enregistrée. Réessayez dans un instant.";
}

function rafraichir() {
  revalidatePath("/stock");
  revalidatePath("/stock/[site]", "page");
  revalidatePath("/");
}

/**
 * Fixe la quantité d'une pièce sur un site.
 *
 * Passe par la fonction SQL `ajuster_stock` et non par une écriture directe :
 * c'est elle qui journalise l'écart dans `mouvements_stock`, ce qui rend toute
 * variation de stock explicable. Les droits d'écriture directe sur `stocks` ont
 * été retirés aux rôles applicatifs pour que ce journal soit complet.
 */
export async function definirStock(_etat: EtatStock, formData: FormData): Promise<EtatStock> {
  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return { erreur: "Session expirée. Reconnectez-vous." };

  const piece_id = Number(formData.get("piece_id"));
  const site_id = Number(formData.get("site_id"));
  const quantite = Number(formData.get("quantite"));
  const seuilBrut = formData.get("seuil_alerte");
  const seuil_alerte = seuilBrut === null || seuilBrut === "" ? null : Number(seuilBrut);

  if (!piece_id) return { erreur: "Choisissez une pièce." };
  if (!site_id) return { erreur: "Site introuvable." };
  if (!Number.isFinite(quantite) || quantite < 0) {
    return { erreur: "La quantité doit être un nombre positif." };
  }
  if (seuil_alerte !== null && (!Number.isFinite(seuil_alerte) || seuil_alerte < 0)) {
    return { erreur: "Le seuil d'alerte doit être un nombre positif." };
  }

  const peutModifier = aVueGlobale(utilisateur) || utilisateur.site_id === site_id;
  if (!peutModifier) return { erreur: "Vous ne pouvez modifier que le stock de votre site." };

  const supabase = await supabaseServeur();
  const { error } = await supabase.rpc("ajuster_stock", {
    p_piece_id: piece_id,
    p_site_id: site_id,
    p_nouvelle_quantite: quantite,
    p_seuil_alerte: seuil_alerte,
    p_motif: "Mise à jour depuis la page Stock",
    p_utilisateur_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
  });

  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: "Quantité enregistrée." };
}

/**
 * Envoie une quantité d'une pièce depuis un site vers un autre.
 * Le stock de départ diminue, celui d'arrivée augmente — dans la même
 * transaction, côté base.
 */
export async function transfererStock(_etat: EtatStock, formData: FormData): Promise<EtatStock> {
  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return { erreur: "Session expirée. Reconnectez-vous." };

  const piece_id = Number(formData.get("piece_id"));
  const site_source = Number(formData.get("site_id"));
  const site_destination = Number(formData.get("site_destination_id"));
  const quantite = Number(formData.get("quantite"));

  if (!piece_id) return { erreur: "Choisissez une pièce." };
  if (!site_source) return { erreur: "Site de départ introuvable." };
  if (!site_destination) return { erreur: "Choisissez le site de destination." };
  if (site_source === site_destination) {
    return { erreur: "Le site de départ et le site d'arrivée doivent être différents." };
  }
  if (!Number.isFinite(quantite) || quantite <= 0) {
    return { erreur: "La quantité à envoyer doit être supérieure à zéro." };
  }

  const peutEnvoyer = aVueGlobale(utilisateur) || utilisateur.site_id === site_source;
  if (!peutEnvoyer) {
    return { erreur: "Vous ne pouvez envoyer du stock que depuis votre propre site." };
  }

  const supabase = await supabaseServeur();
  const { error } = await supabase.rpc("transferer_stock", {
    p_piece_id: piece_id,
    p_site_source: site_source,
    p_site_destination: site_destination,
    p_quantite: quantite,
    p_utilisateur_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
  });

  if (error) return { erreur: messageErreur(error) };

  rafraichir();
  return { succes: "Envoi enregistré." };
}
