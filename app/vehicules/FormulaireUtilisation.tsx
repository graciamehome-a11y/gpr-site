"use client";

import { useActionState } from "react";
import { Astuce, BoutonPrincipal, Carte, Champ, SousTitre } from "@/app/components/ui";
import ChampRecherche from "@/app/components/ChampRecherche";
import ChampQuantite from "@/app/components/ChampQuantite";
import { ajouterUtilisation } from "./actions";

type Option = { id: number; label: string; sousLabel?: string };

export default function FormulaireUtilisation({
  vehicules,
  pieces,
}: {
  vehicules: Option[];
  pieces: Option[];
}) {
  const [etat, action, enCours] = useActionState(ajouterUtilisation, undefined);

  return (
    <Carte className="mb-6">
      <SousTitre>Pièce utilisée pour une réparation</SousTitre>
      <div className="mb-3">
        <Astuce>
          À saisir au fil de l&apos;intervention. La quantité est{" "}
          <strong>retirée automatiquement du stock</strong> du site où se trouve le véhicule —
          c&apos;est l&apos;historique qui permet à un autre technicien de reprendre le travail.
        </Astuce>
      </div>
      <form action={action} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <ChampRecherche
            label="Véhicule"
            name="vehicule_id"
            required
            storageKey="recents-vehicules-utilisation"
            placeholder="Immatriculation…"
            options={vehicules}
          />
        </div>
        <div className="col-span-2">
          <ChampRecherche
            label="Pièce"
            name="piece_id"
            required
            storageKey="recents-pieces-utilisation"
            options={pieces}
          />
        </div>
        <ChampQuantite name="quantite" label="Quantité" defaut={1} min={1} />
        <details className="col-span-2 text-sm">
          <summary className="cursor-pointer select-none text-neutral-500">
            Date : aujourd&apos;hui (modifier)
          </summary>
          <div className="mt-2">
            <Champ
              label="Date"
              name="date_utilisation"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </details>
        <div className="col-span-2">
          <BoutonPrincipal type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </BoutonPrincipal>
        </div>
      </form>

      {etat?.erreur && (
        <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-400" role="alert">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" role="status">
          {etat.succes}
        </p>
      )}
    </Carte>
  );
}
