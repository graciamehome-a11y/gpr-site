"use client";

import { useActionState } from "react";
import { Carte } from "@/app/components/ui";
import { reinitialiserMotDePasse } from "./actions";
import AffichageMotDePasse from "./AffichageMotDePasse";

export type CompteAffiche = {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: string | null;
  site: string | null;
  /** null = ne s'est jamais connecté, undefined = information indisponible. */
  derniereConnexion: string | null | undefined;
  aUneConnexion: boolean;
};

export default function LigneCompte({ compte }: { compte: CompteAffiche }) {
  const [etat, action, enCours] = useActionState(reinitialiserMotDePasse, undefined);

  const jamaisConnecte = compte.derniereConnexion === null;

  return (
    <Carte>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
            {compte.prenom} {compte.nom}
          </p>
          <p className="truncate text-xs text-neutral-500">{compte.email}</p>
          {compte.derniereConnexion && (
            <p className="mt-0.5 text-xs text-neutral-400">
              Dernière connexion : {compte.derniereConnexion}
            </p>
          )}
          {jamaisConnecte && (
            <p className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              Ne s&apos;est jamais connecté
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{compte.role ?? "—"}</p>
          <p className="text-xs text-neutral-500">{compte.site ?? "—"}</p>

          {compte.aUneConnexion && (
            <form action={action} className="mt-1.5">
              <input type="hidden" name="utilisateur_id" value={compte.id} />
              <button
                type="submit"
                disabled={enCours}
                className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {enCours ? "…" : "Réinitialiser le mot de passe"}
              </button>
            </form>
          )}
        </div>
      </div>

      {etat?.erreur && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {etat.erreur}
        </p>
      )}

      {etat?.motDePasse && (
        <AffichageMotDePasse motDePasse={etat.motDePasse} email={compte.email} reinitialisation />
      )}
    </Carte>
  );
}
