"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icone } from "@/app/components/icones";

/**
 * Écran affiché quand une page rencontre une erreur inattendue.
 *
 * Sans ce fichier, Next.js montre sa propre page technique — en anglais, avec
 * une pile d'appels. Ici, on explique ce qui s'est passé en une phrase, on
 * propose de réessayer, et on précise que rien n'a été perdu.
 */
export default function ErreurPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Trace complète côté navigateur, pour le diagnostic.
    console.error("Erreur de page :", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
        <Icone nom="alerte" size={26} />
      </span>

      <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
        Cette page n&apos;a pas pu s&apos;afficher
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        Un problème est survenu pendant le chargement.{" "}
        <strong className="text-neutral-700 dark:text-neutral-300">
          Vos données n&apos;ont pas été perdues
        </strong>{" "}
        : rien n&apos;a été enregistré de travers.
      </p>

      <div className="mt-6 w-full space-y-2">
        <button
          onClick={reset}
          className="w-full rounded-xl bg-accent-600 px-4 py-3 text-[15px] font-medium text-white transition hover:bg-accent-700 active:scale-[0.98]"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="block w-full rounded-xl bg-neutral-100 px-4 py-3 text-center text-[15px] font-medium text-neutral-800 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          Revenir à l&apos;accueil
        </Link>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-neutral-400">
        Si cela se reproduit, notez ce que vous étiez en train de faire et signalez-le. Le code
        d&apos;incident {error.digest ? `« ${error.digest} »` : "affiché dans la console"} permet de
        retrouver la cause exacte.
      </p>
    </div>
  );
}
