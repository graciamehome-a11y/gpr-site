"use client";

import { useEffect, useRef, useState } from "react";

type Option = { id: number; label: string; sousLabel?: string };

type Props = {
  name: string;
  label: string;
  options: Option[];
  storageKey: string; // clé localStorage pour mémoriser les derniers choix (par appareil)
  required?: boolean;
  placeholder?: string;
};

const MAX_RECENTS = 4;
const MAX_SUGGESTIONS = 8;

function lireRecents(storageKey: string): number[] {
  try {
    const brut = localStorage.getItem(storageKey);
    return brut ? (JSON.parse(brut) as number[]) : [];
  } catch {
    return [];
  }
}

function ecrireRecent(storageKey: string, id: number) {
  try {
    const actuels = lireRecents(storageKey).filter((r) => r !== id);
    localStorage.setItem(storageKey, JSON.stringify([id, ...actuels].slice(0, MAX_RECENTS)));
  } catch {
    // localStorage indisponible (navigation privée, etc.) : dégrade sans casser le formulaire.
  }
}

/**
 * Remplace un <select> à rallonge par un champ « taper pour chercher » + des
 * raccourcis « récents » en un tap. Sur mobile, chercher 3 lettres est bien plus
 * rapide que de faire défiler une liste de 100+ éléments (voir RECAP_IMPLEMENTATION.md).
 * Soumet toujours un id via un champ caché — aucun changement côté Server Action.
 */
export default function ChampRecherche({
  name,
  label,
  options,
  storageKey,
  required,
  placeholder = "Taper pour chercher…",
}: Props) {
  const [requete, setRequete] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [selectionId, setSelectionId] = useState<number | null>(null);
  const [recents, setRecents] = useState<Option[]>([]);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lecture ponctuelle de localStorage au montage (indisponible côté serveur,
    // donc impossible à calculer pendant le rendu initial sans provoquer un
    // mismatch d'hydratation) — pas un état dérivé d'une prop/état React.
    const ids = lireRecents(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(ids.map((id) => options.find((o) => o.id === id)).filter((o): o is Option => !!o));
  }, [storageKey, options]);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, []);

  const suggestions = requete.trim()
    ? options
        .filter((o) => o.label.toLowerCase().includes(requete.trim().toLowerCase()))
        .slice(0, MAX_SUGGESTIONS)
    : options.slice(0, MAX_SUGGESTIONS);

  function choisir(option: Option) {
    setSelectionId(option.id);
    setRequete(option.sousLabel ? `${option.label} — ${option.sousLabel}` : option.label);
    setOuvert(false);
    ecrireRecent(storageKey, option.id);
    setRecents((r) => [option, ...r.filter((x) => x.id !== option.id)].slice(0, MAX_RECENTS));
  }

  return (
    <div ref={conteneurRef} className="relative">
      <label className="block text-sm">
        <span className="mb-1 block text-neutral-600 dark:text-neutral-400">{label}</span>
        <input
          type="search"
          value={requete}
          required={required}
          placeholder={placeholder}
          onChange={(e) => {
            setRequete(e.target.value);
            setSelectionId(null);
            setOuvert(true);
          }}
          onFocus={() => setOuvert(true)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
        />
      </label>
      <input type="hidden" name={name} value={selectionId ?? ""} />

      {!ouvert && recents.length > 0 && !selectionId && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {recents.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => choisir(r)}
              className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {ouvert && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {suggestions.length === 0 && (
            <li className="px-3.5 py-2 text-sm text-neutral-400">Aucun résultat</li>
          )}
          {suggestions.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => choisir(o)}
                className="block w-full px-3.5 py-2 text-left text-[15px] active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                {o.label}
                {o.sousLabel && <span className="ml-1.5 text-xs text-neutral-400">{o.sousLabel}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
