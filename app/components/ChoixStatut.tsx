"use client";

import { useActionState } from "react";
import { MessageFormulaire } from "./ui";

export type EtatAction = { erreur?: string; succes?: string } | undefined;

/**
 * Suite de boutons pour faire avancer un statut (véhicule, bon).
 *
 * Chaque bouton envoie le même formulaire, avec un statut différent. Les
 * messages d'erreur sont partagés par la ligne : si le changement échoue, la
 * raison s'affiche juste en dessous, au lieu de ne rien faire du tout — ce qui
 * était le comportement précédent et laissait croire à un bug.
 */
export default function ChoixStatut({
  id,
  statuts,
  actuel,
  action,
}: {
  id: number;
  statuts: { valeur: string; label: string }[];
  actuel: string;
  action: (etat: EtatAction, formData: FormData) => Promise<EtatAction>;
}) {
  const [etat, formAction, enCours] = useActionState(action, undefined);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {statuts.map((s) => {
          const actif = actuel === s.valeur;
          return (
            <form key={s.valeur} action={formAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="statut" value={s.valeur} />
              <button
                type="submit"
                disabled={actif || enCours}
                aria-current={actif ? "true" : undefined}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:cursor-default ${
                  actif
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-500 active:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {s.label}
              </button>
            </form>
          );
        })}
      </div>
      <MessageFormulaire erreur={etat?.erreur} />
    </div>
  );
}
