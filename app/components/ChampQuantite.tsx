"use client";

import { useState } from "react";

type Props = {
  name: string;
  label: string;
  defaut?: number;
  min?: number;
  pas?: number;
  presets?: number[]; // ex. [10, 20, 50, 100] pour le carburant : un tap au lieu de taper au clavier
};

/** Stepper -/+ à gros boutons : un tap au lieu du clavier numérique, pour les cas les plus fréquents. */
export default function ChampQuantite({ name, label, defaut = 1, min = 0, pas = 1, presets }: Props) {
  const [valeur, setValeur] = useState(defaut);

  function changer(delta: number) {
    setValeur((v) => Math.max(min, v + delta));
  }

  return (
    <div>
      <span className="mb-1 block text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => changer(-pas)}
          aria-label="Diminuer"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-lg font-medium text-neutral-700 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
        >
          −
        </button>
        <input
          type="number"
          name={name}
          value={valeur}
          min={min}
          onChange={(e) => setValeur(Number(e.target.value) || 0)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-center text-[15px] tabular-nums outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={() => changer(pas)}
          aria-label="Augmenter"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-lg font-medium text-neutral-700 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
        >
          +
        </button>
      </div>
      {presets && presets.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setValeur(p)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                valeur === p
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-500 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
