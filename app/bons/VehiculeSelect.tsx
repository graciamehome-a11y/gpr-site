"use client";

import { useState } from "react";
import { Champ, Selecteur } from "@/app/components/ui";

type Props = {
  types: { id: number; nom: string }[];
};

export default function VehiculeSelect({ types }: Props) {
  const [autreChoisi, setAutreChoisi] = useState(false);

  return (
    <div className="space-y-3">
      <Selecteur
        label="Véhicule"
        name="vehicule_nom_select"
        required
        defaultValue=""
        onChange={(e) => setAutreChoisi(e.target.value === "AUTRE")}
      >
        <option value="" disabled>
          -- choisir --
        </option>
        {types.map((t) => (
          <option key={t.id} value={t.nom}>
            {t.nom}
          </option>
        ))}
        <option value="AUTRE">Autre…</option>
      </Selecteur>
      {autreChoisi && (
        <Champ label="Précisez le véhicule" name="vehicule_nom_autre" required autoFocus />
      )}
    </div>
  );
}
