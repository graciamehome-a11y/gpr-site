"use client";

import { useMemo, useState } from "react";
import ChampRecherche from "@/app/components/ChampRecherche";
import { Selecteur } from "@/app/components/ui";

type Option = { id: number; label: string; sousLabel?: string };

/**
 * Choix d'une pièce, en commençant par le véhicule.
 *
 * Le client cherchait « les pièces par véhicule » : avec un catalogue de
 * plusieurs centaines de références, et des pièces qui portent le même nom
 * (« Amortisseur AR » existe en CSK et en LAND-CRUISER), taper le nom à
 * l'aveugle est long et source d'erreur. On choisit donc d'abord l'engin, ce
 * qui réduit la liste à quelques lignes, puis la pièce.
 *
 * Le filtre est facultatif : « Tous les véhicules » laisse la liste complète.
 */
export default function ChampPiece({
  name,
  label = "Pièce",
  options,
  storageKey,
  required,
  avecFiltre = true,
}: {
  name: string;
  label?: string;
  options: Option[];
  storageKey: string;
  required?: boolean;
  avecFiltre?: boolean;
}) {
  const [typeFiltre, setTypeFiltre] = useState("");

  const types = useMemo(() => {
    const vus = new Set<string>();
    for (const o of options) vus.add(o.sousLabel ?? "Générique");
    return [...vus].sort((a, b) => a.localeCompare(b, "fr"));
  }, [options]);

  const filtrees = useMemo(
    () =>
      typeFiltre ? options.filter((o) => (o.sousLabel ?? "Générique") === typeFiltre) : options,
    [options, typeFiltre],
  );

  const recherche = (
    <ChampRecherche
      label={label}
      name={name}
      required={required}
      storageKey={storageKey}
      options={filtrees}
      placeholder={
        filtrees.length === 0 ? "Aucune pièce pour ce véhicule" : "Taper pour chercher…"
      }
    />
  );

  // Un seul véhicule au catalogue, ou aucun sous-libellé : le filtre n'apporte
  // rien, on l'omet pour ne pas ajouter un geste inutile.
  if (!avecFiltre || types.length <= 1) {
    return <div className="space-y-3">{recherche}</div>;
  }

  return (
    <div className="space-y-3">
      <Selecteur
        label="Véhicule concerné"
        value={typeFiltre}
        onChange={(e) => setTypeFiltre(e.target.value)}
      >
        <option value="">Tous les véhicules ({options.length} pièces)</option>
        {types.map((t) => (
          <option key={t} value={t}>
            {t} ({options.filter((o) => (o.sousLabel ?? "Générique") === t).length} pièces)
          </option>
        ))}
      </Selecteur>
      {recherche}
    </div>
  );
}
