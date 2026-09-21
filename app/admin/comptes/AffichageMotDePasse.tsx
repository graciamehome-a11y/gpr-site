"use client";

import { useState } from "react";

/**
 * Affiche le mot de passe temporaire une seule fois, avec de quoi le copier.
 * Il n'est jamais renvoyé par le serveur ensuite : si on le perd, il faut en
 * générer un nouveau.
 */
export default function AffichageMotDePasse({
  motDePasse,
  email,
  reinitialisation,
}: {
  motDePasse: string;
  email: string;
  reinitialisation?: boolean;
}) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(motDePasse);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers indisponible : le mot de passe reste lisible à l'écran.
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900 dark:bg-emerald-950">
      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
        {reinitialisation ? "Nouveau mot de passe pour" : "Compte créé pour"} {email}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 select-all rounded-lg bg-white px-3 py-2 text-center text-[15px] font-semibold tracking-wide text-neutral-900 dark:bg-neutral-900 dark:text-white">
          {motDePasse}
        </code>
        <button
          type="button"
          onClick={copier}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700"
        >
          {copie ? "Copié" : "Copier"}
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
        <strong>Notez-le maintenant :</strong> il ne sera plus jamais affiché. Transmettez-le à la
        personne de vive voix ou par un moyen sûr — elle pourra le changer depuis « Mon mot de
        passe » après sa première connexion.
      </p>
    </div>
  );
}
