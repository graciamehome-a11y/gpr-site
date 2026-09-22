"use client";

import { useActionState } from "react";
import { BoutonPrincipal, Champ, MessageFormulaire } from "@/app/components/ui";
import { majTypeVehicule, supprimerTypeVehicule } from "./actions";

export type TypeAffiche = {
  id: number;
  nom: string;
  marque: string | null;
  nbPieces: number;
  nbVehicules: number;
};

/**
 * Une ligne du référentiel des types de véhicules.
 *
 * La modification et la suppression sont repliées : la liste reste lisible, et
 * on ne risque pas de modifier un type par erreur en touchant l'écran.
 */
export default function LigneType({ type }: { type: TypeAffiche }) {
  const [etatMaj, actionMaj, majEnCours] = useActionState(majTypeVehicule, undefined);
  const [etatSup, actionSup, supEnCours] = useActionState(supprimerTypeVehicule, undefined);

  const utilise = type.nbPieces > 0 || type.nbVehicules > 0;

  return (
    <details className="group rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <summary className="flex cursor-pointer select-none items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-neutral-900 dark:text-white">
            {type.nom}
          </span>
          <span className="block text-xs text-neutral-500">
            {type.marque ? `${type.marque} · ` : ""}
            {type.nbPieces} pièce{type.nbPieces > 1 ? "s" : ""}
            {type.nbVehicules > 0
              ? ` · ${type.nbVehicules} véhicule${type.nbVehicules > 1 ? "s" : ""}`
              : ""}
          </span>
        </span>
        <span className="shrink-0 text-neutral-400 transition group-open:rotate-45">+</span>
      </summary>

      <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <form action={actionMaj} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="id" value={type.id} />
          <Champ label="Nom" name="nom" defaultValue={type.nom} required />
          <Champ label="Marque (facultatif)" name="marque" defaultValue={type.marque ?? ""} />
          <div className="col-span-2">
            <BoutonPrincipal type="submit" disabled={majEnCours}>
              {majEnCours ? "Enregistrement…" : "Enregistrer les modifications"}
            </BoutonPrincipal>
          </div>
        </form>
        <MessageFormulaire erreur={etatMaj?.erreur} succes={etatMaj?.succes} />

        <form action={actionSup} className="mt-3">
          <input type="hidden" name="id" value={type.id} />
          <button
            type="submit"
            disabled={supEnCours || utilise}
            title={
              utilise
                ? "Ce type est utilisé par des pièces ou des véhicules : il ne peut pas être supprimé."
                : undefined
            }
            className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            {supEnCours ? "Suppression…" : "Supprimer ce type"}
          </button>
          {utilise && (
            <p className="mt-1.5 text-xs text-neutral-400">
              Utilisé par {type.nbPieces} pièce{type.nbPieces > 1 ? "s" : ""} et{" "}
              {type.nbVehicules} véhicule{type.nbVehicules > 1 ? "s" : ""} : à détacher d&apos;abord.
            </p>
          )}
        </form>
        <MessageFormulaire erreur={etatSup?.erreur} succes={etatSup?.succes} />
      </div>
    </details>
  );
}
