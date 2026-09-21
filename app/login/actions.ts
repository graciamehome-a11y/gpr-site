"use server";

import { redirect } from "next/navigation";
import { supabaseServeur } from "@/lib/supabaseServerClient";

export type EtatConnexion = { erreur?: string } | undefined;

export async function connexion(
  _etat: EtatConnexion,
  formData: FormData,
): Promise<EtatConnexion> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const suivant = (formData.get("suivant") as string) || "/";

  if (!email || !password) {
    return { erreur: "Merci de renseigner votre email et votre mot de passe." };
  }

  const supabase = await supabaseServeur();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // On distingue le seul cas où réessayer à l'identique ne sert à rien :
    // sinon, un message unique évite de révéler si l'adresse existe.
    if (/rate limit|too many/i.test(error.message)) {
      return { erreur: "Trop de tentatives. Patientez quelques minutes avant de réessayer." };
    }
    if (/email not confirmed/i.test(error.message)) {
      return {
        erreur:
          "Ce compte n'est pas encore activé. Demandez à un responsable de vous générer un mot de passe.",
      };
    }
    return { erreur: "Email ou mot de passe incorrect." };
  }

  redirect(suivant.startsWith("/") ? suivant : "/");
}

export async function deconnexion() {
  const supabase = await supabaseServeur();
  await supabase.auth.signOut();
  redirect("/login");
}
