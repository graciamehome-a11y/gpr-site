"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Astuce, BoutonPrincipal, Carte, Champ, SousTitre } from "@/app/components/ui";
import ChampRecherche from "@/app/components/ChampRecherche";
import ChampPiece from "@/app/components/ChampPiece";
import ChampQuantite from "@/app/components/ChampQuantite";
import { ajouterDemande } from "./actions";

type Option = { id: number; label: string; sousLabel?: string };

export default function FormulaireBon({
  vehicules,
  pieces,
}: {
  vehicules: Option[];
  pieces: Option[];
}) {
  const [etat, action, enCours] = useActionState(ajouterDemande, undefined);
  const aucunVehicule = vehicules.length === 0;

  return (
    <Carte className="mb-6">
      <SousTitre>Nouvelle demande</SousTitre>
      <div className="mb-3">
        <Astuce>
          Le bon papier reste la référence officielle pour les signatures. Ici, c&apos;est la
          mémoire numérique : on garde la trace et on suit le statut.
        </Astuce>
      </div>

      {aucunVehicule ? (
        <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center dark:border-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Aucun véhicule enregistré pour l&apos;instant.
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Un bon se rattache à un véhicule précis : enregistrez d&apos;abord son arrivée.
          </p>
          <Link
            href="/vehicules"
            className="mt-3 inline-block rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-700"
          >
            Enregistrer une arrivée
          </Link>
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <ChampRecherche
            label="Véhicule"
            name="vehicule_id"
            required
            storageKey="recents-vehicules-bons"
            placeholder="Immatriculation…"
            options={vehicules}
          />

          <ChampPiece
            label="Pièce"
            name="piece_id"
            required
            storageKey="recents-pieces-bons"
            options={pieces}
          />

          <ChampQuantite name="quantite" label="Quantité" defaut={1} min={1} />

          <details className="text-sm">
            <summary className="cursor-pointer select-none text-neutral-500">
              Date : aujourd&apos;hui (modifier)
            </summary>
            <div className="mt-2">
              <Champ
                label="Date"
                name="date_demande"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </details>

          <p className="text-xs text-neutral-400">
            Le site du bon est celui du véhicule choisi. Un véhicule absent de la liste ?{" "}
            <Link href="/vehicules" className="text-accent-600 hover:underline dark:text-accent-300">
              Enregistrez d&apos;abord son arrivée
            </Link>
            .
          </p>

          <BoutonPrincipal type="submit" disabled={enCours}>
            {enCours ? "Envoi…" : "Envoyer la demande"}
          </BoutonPrincipal>

          {etat?.erreur && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-400" role="alert">
              {etat.erreur}
            </p>
          )}
          {etat?.succes && (
            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" role="status">
              {etat.succes}
            </p>
          )}
        </form>
      )}
    </Carte>
  );
}
