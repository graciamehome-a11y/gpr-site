"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Props = {
  types: { id: number; nom: string }[];
};

export default function VehiculeSelect({ types }: Props) {
  const [autreChoisi, setAutreChoisi] = useState(false);

  return (
    <label>
      Véhicule
      <select
        name="vehicule_nom_select"
        required
        className={styles.select}
        onChange={(e) => setAutreChoisi(e.target.value === "AUTRE")}
      >
        <option value="">-- choisir --</option>
        {types.map((t) => (
          <option key={t.id} value={t.nom}>
            {t.nom}
          </option>
        ))}
        <option value="AUTRE">Autre...</option>
      </select>
      {autreChoisi && (
        <input
          name="vehicule_nom_autre"
          placeholder="Précisez le véhicule"
          required
          className={styles.input}
        />
      )}
    </label>
  );
}
