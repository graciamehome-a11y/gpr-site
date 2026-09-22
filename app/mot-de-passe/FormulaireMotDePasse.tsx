"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseNavigateur } from "@/lib/supabaseBrowserClient";
import { changerMotDePasse } from "./actions";

type EtatLien = "sans-session" | "ouverture" | "ouvert" | "echec";

export default function FormulaireMotDePasse({
  premier,
  email,
  connecte,
}: {
  premier: boolean;
  email: string;
  connecte: boolean;
}) {
  const [etat, action, enCours] = useActionState(changerMotDePasse, undefined);
  const [etatLien, setEtatLien] = useState<EtatLien>(connecte ? "ouvert" : "sans-session");

  /**
   * Selon la façon dont Supabase est configuré, un lien de réinitialisation
   * arrive sous trois formes différentes :
   *   - `?token_hash=…`  → déjà échangé par /auth/confirm (session en place) ;
   *   - `?code=…`        → flux PKCE, à échanger ici ;
   *   - `#access_token=…` → flux historique, session dans le fragment d'URL,
   *     invisible du serveur : c'est au navigateur de la poser.
   * On gère les trois, pour que le lien fonctionne quelle que soit la
   * configuration du projet.
   *
   * Lecture ponctuelle de l'URL au montage : cette information n'existe que
   * dans le navigateur, donc impossible à calculer pendant le rendu initial
   * sans provoquer un écart d'hydratation. Ce n'est pas un état dérivé d'une
   * prop ou d'un état React — même cas que dans ChampRecherche.tsx.
   */
  useEffect(() => {
    if (connecte) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const erreurLien = hash.get("error_description") ?? params.get("error_description");

    if (!code && !accessToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (erreurLien) setEtatLien("echec");
      return;
    }

    setEtatLien("ouverture");
    const supabase = supabaseNavigateur();

    const ouvrir = code
      ? supabase.auth.exchangeCodeForSession(code)
      : supabase.auth.setSession({
          access_token: accessToken!,
          refresh_token: refreshToken ?? "",
        });

    ouvrir
      .then(({ error }) => {
        if (error) {
          setEtatLien("echec");
          return;
        }
        // On retire les jetons de la barre d'adresse et de l'historique.
        window.history.replaceState(null, "", window.location.pathname);
        setEtatLien("ouvert");
      })
      .catch(() => setEtatLien("echec"));
  }, [connecte]);

  if (etatLien === "ouverture") {
    return (
      <Cadre titre="Ouverture de votre lien…" sousTitre="Quelques secondes.">
        <p className="text-sm text-neutral-500">Vérification du lien en cours.</p>
      </Cadre>
    );
  }

  if (etatLien === "echec") {
    return (
      <Cadre
        titre="Lien inutilisable"
        sousTitre="Un lien ne sert qu'une seule fois et reste valable une heure."
      >
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          Ce lien a déjà servi, a expiré, ou a été ouvert depuis un autre navigateur. Demandez à un
          responsable de vous en générer un nouveau, ou reconnectez-vous si vous connaissez votre
          mot de passe.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-accent-600 px-4 py-3 text-center text-[15px] font-medium text-white transition hover:bg-accent-700"
        >
          Aller à la connexion
        </Link>
      </Cadre>
    );
  }

  return (
    <Cadre
      titre={premier ? "Choisissez votre mot de passe" : "Mon mot de passe"}
      sousTitre={
        premier
          ? "Dernière étape : votre compte est actif, choisissez le mot de passe qui vous servira à vous connecter."
          : email
      }
    >
      {premier && (
        <>
          <p className="mb-3 rounded-xl bg-accent-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-accent-900 dark:bg-accent-950/40 dark:text-accent-200">
            Le mot de passe que vous avez utilisé pour entrer est <strong>provisoire</strong> : il a
            été créé par un responsable, qui le connaît. Choisissez-en un maintenant, que vous serez
            seul(e) à connaître. Il vous servira pour toutes vos prochaines connexions.
          </p>
          <p className="mb-4 text-xs leading-relaxed text-neutral-500">
            Notez-le quelque part de sûr. Personne ne pourra le retrouver à votre place — en cas
            d&apos;oubli, un responsable devra vous en générer un nouveau.
          </p>
        </>
      )}

      <form
        action={action}
        className="space-y-3 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm shadow-neutral-950/[0.04] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none"
      >
        <div>
          <label
            htmlFor="motDePasse"
            className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400"
          >
            Nouveau mot de passe
          </label>
          <input
            id="motDePasse"
            name="motDePasse"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            autoFocus
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none transition-colors focus:border-accent-400 dark:border-neutral-800 dark:bg-neutral-950"
          />
          <p className="mt-1 text-xs text-neutral-400">8 caractères minimum.</p>
        </div>

        <div>
          <label
            htmlFor="confirmation"
            className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400"
          >
            Confirmez le mot de passe
          </label>
          <input
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none transition-colors focus:border-accent-400 dark:border-neutral-800 dark:bg-neutral-950"
          />
        </div>

        {etat?.erreur && (
          <p className="text-sm text-red-600" role="alert">
            {etat.erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="w-full rounded-xl bg-accent-600 px-4 py-3 text-[15px] font-medium text-white transition hover:bg-accent-700 active:scale-[0.98] disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer et continuer"}
        </button>
      </form>
    </Cadre>
  );
}

function Cadre({
  titre,
  sousTitre,
  children,
}: {
  titre: string;
  sousTitre?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">{titre}</h1>
          {sousTitre && <p className="mt-1 text-sm text-neutral-500">{sousTitre}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
