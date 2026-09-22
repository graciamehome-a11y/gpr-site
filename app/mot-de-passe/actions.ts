"use server";

import { redirect } from "next/navigation";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { messageSiMotDePasseInvalide } from "@/lib/motDePasse";

export type EtatMotDePasse = { erreur?: string } | undefined;

/** Les messages de Supabase Auth sont en anglais et parfois techniques. */
function traduireErreur(message: string): string {
  if (/different from the old password/i.test(message)) {
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  }
  if (/at least|too short|weak/i.test(message)) {
    return "Mot de passe trop court ou trop simple. Utilisez au moins 8 caractères.";
  }
  if (/rate limit|too many/i.test(message)) {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }
  if (/session|jwt|not authenticated/i.test(message)) {
    return "Votre session a expiré. Reconnectez-vous pour définir un mot de passe.";
  }
  return "Le mot de passe n'a pas pu être enregistré. Réessayez.";
}

export async function changerMotDePasse(
  _etat: EtatMotDePasse,
  formData: FormData,
): Promise<EtatMotDePasse> {
  const motDePasse = (formData.get("motDePasse") as string) ?? "";
  const confirmation = (formData.get("confirmation") as string) ?? "";

  const invalide = messageSiMotDePasseInvalide(motDePasse);
  if (invalide) return { erreur: invalide };

  if (motDePasse !== confirmation) {
    return { erreur: "Les deux mots de passe saisis ne sont pas identiques." };
  }

  const supabase = await supabaseServeur();
  const { error } = await supabase.auth.updateUser({ password: motDePasse });

  if (error) return { erreur: traduireErreur(error.message) };

  // La personne a maintenant un mot de passe qu'elle est seule à connaître :
  // on lève le drapeau qui l'obligeait à en choisir un. Si cet appel échoue,
  // elle sera simplement invitée à nouveau — jamais bloquée.
  const { error: erreurDrapeau } = await supabase.rpc("marquer_mot_de_passe_personnel");
  if (erreurDrapeau) {
    console.error("marquer_mot_de_passe_personnel:", erreurDrapeau.message);
  }

  redirect("/");
}
