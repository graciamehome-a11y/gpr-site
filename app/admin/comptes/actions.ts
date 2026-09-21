"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { genererMotDePasseTemporaire } from "@/lib/motDePasse";

export type EtatCompte =
  | {
      erreur?: string;
      /** Mot de passe temporaire, affiché une seule fois. */
      motDePasse?: string;
      email?: string;
      /** true = réinitialisation d'un compte existant, false = création. */
      reinitialisation?: boolean;
    }
  | undefined;

const NON_AUTORISE = "Action réservée aux rôles à vue globale (Chef Garage, Comptable Matières, Chef Service Technique).";

/**
 * Crée un compte avec un mot de passe temporaire.
 *
 * Auparavant, la création passait par `inviteUserByEmail`. Or ce projet utilise
 * le fournisseur d'emails par défaut de Supabase, qui n'envoie qu'aux membres de
 * l'équipe du projet et plafonne à 2 emails par heure : les invitations aux
 * vraies adresses clientes n'arrivaient jamais, et la personne ne pouvait donc
 * jamais définir de mot de passe ni se connecter. L'API de Supabase refuse même
 * d'en modifier les modèles sur l'offre gratuite :
 *   « Email template modification is not available for free tier projects using
 *     the default email provider. »
 *
 * Le mot de passe est donc généré ici et affiché une seule fois à la personne
 * qui crée le compte, à charge pour elle de le transmettre. Plus aucune
 * dépendance à l'envoi d'emails.
 */
export async function creerCompte(_etat: EtatCompte, formData: FormData): Promise<EtatCompte> {
  const demandeur = await getUtilisateurConnecte();
  if (!aVueGlobale(demandeur)) return { erreur: NON_AUTORISE };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const nom = (formData.get("nom") as string)?.trim();
  const prenom = (formData.get("prenom") as string)?.trim();
  const role_id = Number(formData.get("role_id"));
  const site_id_brut = formData.get("site_id") as string;
  const site_id = site_id_brut ? Number(site_id_brut) : null;

  if (!email || !nom || !prenom || !role_id) {
    return { erreur: "Prénom, nom, email et rôle sont obligatoires." };
  }
  if (!email.includes("@") || email.length < 5) {
    return { erreur: "Cette adresse email n'a pas l'air valide." };
  }

  const motDePasse = genererMotDePasseTemporaire();
  const admin = supabaseAdmin();

  // 1. Le compte de connexion. `email_confirm: true` le rend utilisable tout de
  //    suite : aucune confirmation par email n'est nécessaire.
  const { data, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });

  if (erreurAuth || !data?.user) {
    console.error("createUser:", erreurAuth?.message);
    if (/already|exists|registered/i.test(erreurAuth?.message ?? "")) {
      return {
        erreur:
          "Un compte de connexion existe déjà avec cette adresse. Utilisez « Réinitialiser le mot de passe » sur sa ligne ci-dessous.",
      };
    }
    return { erreur: "Le compte n'a pas pu être créé. Réessayez dans un instant." };
  }

  // 2. La fiche applicative (rôle, site). Si elle échoue, on supprime le compte
  //    de connexion : sinon il resterait un accès orphelin, sans rôle ni site,
  //    impossible à utiliser et invisible dans la liste.
  const { error: erreurProfil } = await admin.from("utilisateurs").insert({
    auth_id: data.user.id,
    nom,
    prenom,
    email,
    role_id,
    site_id,
  });

  if (erreurProfil) {
    console.error("insert utilisateurs:", erreurProfil.message);
    await admin.auth.admin.deleteUser(data.user.id);
    return { erreur: "Le compte n'a pas pu être enregistré. Réessayez dans un instant." };
  }

  revalidatePath("/admin/comptes");
  return { motDePasse, email };
}

/**
 * Génère un nouveau mot de passe temporaire pour un compte existant.
 *
 * Sert à débloquer les personnes déjà bloquées : celles dont l'invitation n'est
 * jamais arrivée, ou qui ont perdu leur mot de passe. Fonctionne aussi pour un
 * compte invité qui n'a encore jamais défini de mot de passe.
 */
export async function reinitialiserMotDePasse(
  _etat: EtatCompte,
  formData: FormData,
): Promise<EtatCompte> {
  const demandeur = await getUtilisateurConnecte();
  if (!aVueGlobale(demandeur)) return { erreur: NON_AUTORISE };

  const id = Number(formData.get("utilisateur_id"));
  if (!id) return { erreur: "Compte introuvable." };

  const admin = supabaseAdmin();
  const { data: profil, error: erreurLecture } = await admin
    .from("utilisateurs")
    .select("auth_id, email")
    .eq("id", id)
    .single<{ auth_id: string | null; email: string }>();

  if (erreurLecture || !profil) {
    return { erreur: "Compte introuvable." };
  }
  if (!profil.auth_id) {
    // Ligne applicative sans compte de connexion : le cas se produisait quand
    // l'envoi de l'invitation échouait après la création de la fiche.
    return {
      erreur:
        "Ce compte n'est relié à aucune connexion (l'invitation avait échoué). Supprimez-le et recréez-le.",
    };
  }

  const motDePasse = genererMotDePasseTemporaire();

  const { error } = await admin.auth.admin.updateUserById(profil.auth_id, {
    password: motDePasse,
    // Réactive au passage un compte qui n'avait jamais confirmé son adresse.
    email_confirm: true,
  });

  if (error) {
    console.error("updateUserById:", error.message);
    return { erreur: "Le mot de passe n'a pas pu être réinitialisé. Réessayez dans un instant." };
  }

  revalidatePath("/admin/comptes");
  return { motDePasse, email: profil.email, reinitialisation: true };
}
