import type { ReactNode } from "react";

export function Carte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function TitrePage({ titre, description }: { titre: string; description?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">{titre}</h1>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
    </div>
  );
}

const styleChamp =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900";

export function Champ({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-600 dark:text-neutral-400">{label}</span>
      <input className={styleChamp} {...props} />
    </label>
  );
}

export function Selecteur({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-600 dark:text-neutral-400">{label}</span>
      <select className={styleChamp} {...props}>
        {children}
      </select>
    </label>
  );
}

export function BoutonPrincipal({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-[15px] font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Illustration minimale (caisse vide) pour les listes sans donnée — un trait, pas de remplissage. */
export function EtatVide({ titre, description }: { titre: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-12 text-center dark:border-neutral-800">
      <svg
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-neutral-300 dark:text-neutral-700"
        aria-hidden
      >
        <path d="M21 8 12 3 3 8m18 0v8l-9 5-9-5V8m18 0-9 5m0 0L3 8m9 5v8" />
      </svg>
      <div>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{titre}</p>
        {description && <p className="text-xs text-neutral-400">{description}</p>}
      </div>
    </div>
  );
}

const COULEURS_STATUT: Record<string, string> = {
  en_attente: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  valide: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  refuse: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  livre: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  arrive: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  en_reparation: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  transfere: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  pret: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

export function Badge({ statut, texte }: { statut: string; texte: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
        COULEURS_STATUT[statut] ?? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800"
      }`}
    >
      {texte}
    </span>
  );
}
