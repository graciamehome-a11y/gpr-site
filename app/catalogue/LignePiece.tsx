"use client";

import { useActionState } from "react";
import { BoutonPrincipal, Champ, MessageFormulaire, Selecteur } from "@/app/components/ui";
import { majPiece, supprimerPiece } from "./actions";

export type PieceAffichee = {
  id: number;
  nom: string;
  categorie: string | null;
  reference: string | null;
  type_vehicule_id: number | null;
};

/**
 * Une ligne du catalogue des pièces. Le type de véhicule est modifiable ici :
 * c'est ce qui permet de rattacher une pièce au bon engin, et donc de
 * distinguer deux pièces qui portent le même nom.
 */
export default function LignePiece({
  piece,
  types,
}: {
  piece: PieceAffichee;
  types: { id: number; nom: string }[];
}) {
  const [etatMaj, actionMaj, majEnCours] = useActionState(majPiece, undefined);
  const [etatSup, actionSup, supEnCours] = useActionState(supprimerPiece, undefined);

  return (
    <details className="group rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <summary className="flex cursor-pointer select-none items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-neutral-900 dark:text-white">
            {piece.nom}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            {types.find((t) => t.id === piece.type_vehicule_id)?.nom ?? "Générique"}
            {piece.categorie ? ` · ${piece.categorie}` : ""}
            {piece.reference ? ` · réf. ${piece.reference}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-neutral-400 transition group-open:rotate-45">+</span>
      </summary>

      <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <form action={actionMaj} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="id" value={piece.id} />
          <div className="col-span-2">
            <Champ label="Nom de la pièce" name="nom" defaultValue={piece.nom} required />
          </div>
          <Selecteur
            label="Véhicule concerné"
            name="type_vehicule_id"
            defaultValue={piece.type_vehicule_id ? String(piece.type_vehicule_id) : ""}
          >
            <option value="">— Générique (lubrifiant, consommable) —</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </Selecteur>
          <Champ label="Catégorie (facultatif)" name="categorie" defaultValue={piece.categorie ?? ""} />
          <div className="col-span-2">
            <Champ
              label="Référence (facultatif)"
              name="reference"
              defaultValue={piece.reference ?? ""}
            />
          </div>
          <div className="col-span-2">
            <BoutonPrincipal type="submit" disabled={majEnCours}>
              {majEnCours ? "Enregistrement…" : "Enregistrer les modifications"}
            </BoutonPrincipal>
          </div>
        </form>
        <MessageFormulaire erreur={etatMaj?.erreur} succes={etatMaj?.succes} />

        <form action={actionSup} className="mt-3">
          <input type="hidden" name="id" value={piece.id} />
          <button
            type="submit"
            disabled={supEnCours}
            className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            {supEnCours ? "Suppression…" : "Supprimer cette pièce"}
          </button>
          <p className="mt-1.5 text-xs text-neutral-400">
            Refusé si la pièce apparaît dans un stock ou un historique.
          </p>
        </form>
        <MessageFormulaire erreur={etatSup?.erreur} succes={etatSup?.succes} />
      </div>
    </details>
  );
}
