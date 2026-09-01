import type { ReactNode } from "react";
import Link from "next/link";
import { Icone, type NomIcone } from "@/app/components/icones";

/* ============================================================
 *  Primitives visuelles — partagées par toutes les pages.
 *  Base neutre, coins arrondis 2xl, ombre discrète, un seul accent.
 * ============================================================ */

/** Largeur de lecture standard + gouttières — évite de répéter les classes. */
export function Conteneur({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 ${className}`}>{children}</div>
  );
}

export function Carte({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm shadow-neutral-950/[0.03] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}

export function TitrePage({
  titre,
  description,
  icone,
  action,
}: {
  titre: string;
  description?: string;
  icone?: NomIcone;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icone && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-300">
            <Icone nom={icone} size={18} />
          </span>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            {titre}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Titre de bloc à l'intérieur d'une page (au-dessus d'une liste, d'un formulaire…). */
export function SousTitre({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{children}</p>
  );
}

const styleChamp =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-accent-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white";

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
  variante = "solide",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "solide" | "accent" | "discret";
}) {
  const styles = {
    solide:
      "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200",
    accent: "bg-accent-600 text-white hover:bg-accent-700",
    discret:
      "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700",
  }[variante];

  return (
    <button
      className={`w-full rounded-xl px-4 py-2.5 text-[15px] font-medium transition active:scale-[0.98] disabled:opacity-60 ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Bloc « rien à afficher » — sert aussi de mini-mode d'emploi : une illustration
 * au trait, une phrase qui explique à quoi sert la section, et un premier geste.
 */
export function EtatVide({
  titre,
  description,
  illustration,
  action,
}: {
  titre: string;
  description?: string;
  illustration?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center dark:border-neutral-800">
      {illustration ?? (
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
      )}
      <div className="max-w-xs">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{titre}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-neutral-400">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-700"
        >
          {action.label}
          <Icone nom="fleche" size={14} />
        </Link>
      )}
    </div>
  );
}

/** Encart d'aide contextuelle — une astuce courte au-dessus ou sous un formulaire. */
export function Astuce({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-accent-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-accent-900 dark:bg-accent-950/40 dark:text-accent-200">
      <span className="mt-px shrink-0 text-accent-500">
        <Icone nom="aide" size={15} />
      </span>
      <p>{children}</p>
    </div>
  );
}

/** Suite d'étapes reliées par des flèches — cycle de vie d'un bon, statut d'un véhicule… */
export function FluxStatuts({ etapes }: { etapes: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {etapes.map((e, i) => (
        <span key={e} className="flex items-center gap-1.5">
          <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            {e}
          </span>
          {i < etapes.length - 1 && (
            <span className="text-neutral-300 dark:text-neutral-600">
              <Icone nom="fleche" size={14} />
            </span>
          )}
        </span>
      ))}
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

/* ============================================================
 *  Blocs de tableau de bord
 * ============================================================ */

type Ton = "neutre" | "accent" | "ambre" | "emeraude" | "rouge";

const TONS_STAT: Record<Ton, string> = {
  neutre: "text-neutral-900 dark:text-white",
  accent: "text-accent-600 dark:text-accent-300",
  ambre: "text-amber-600 dark:text-amber-400",
  emeraude: "text-emerald-600 dark:text-emerald-400",
  rouge: "text-red-600 dark:text-red-400",
};

/** Une valeur clé + son libellé. À placer dans <GrilleStats>. */
export function Stat({
  label,
  valeur,
  indice,
  ton = "neutre",
}: {
  label: string;
  valeur: ReactNode;
  indice?: string;
  ton?: Ton;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm shadow-neutral-950/[0.03] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight ${TONS_STAT[ton]}`}>
        {valeur}
      </p>
      {indice && <p className="mt-0.5 text-xs text-neutral-400">{indice}</p>}
    </div>
  );
}

export function GrilleStats({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}

/** Carte à en-tête : titre + icône + action optionnelle, puis contenu. */
export function Section({
  titre,
  icone,
  action,
  children,
  className = "",
}: {
  titre: string;
  icone?: NomIcone;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 bg-white shadow-sm shadow-neutral-950/[0.03] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          {icone && (
            <span className="text-neutral-400 dark:text-neutral-500">
              <Icone nom={icone} size={16} />
            </span>
          )}
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {titre}
          </h2>
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Grand lien tactile : icône + intitulé. À placer dans <GrilleRaccourcis>. */
export function Raccourci({
  href,
  icone,
  titre,
  sousTitre,
}: {
  href: string;
  icone: NomIcone;
  titre: string;
  sousTitre?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm shadow-neutral-950/[0.03] transition hover:border-accent-300 hover:bg-accent-50/40 active:scale-[0.99] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none dark:hover:border-accent-800 dark:hover:bg-accent-950/30"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition group-hover:bg-accent-100 dark:bg-accent-950 dark:text-accent-300">
        <Icone nom={icone} size={19} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-neutral-900 dark:text-white">{titre}</span>
        {sousTitre && (
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
            {sousTitre}
          </span>
        )}
      </span>
    </Link>
  );
}

export function GrilleRaccourcis({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

/** Ligne d'une liste compacte (activité récente, alertes…). */
export function Ligne({
  principal,
  secondaire,
  valeur,
  ton = "neutre",
}: {
  principal: ReactNode;
  secondaire?: ReactNode;
  valeur?: ReactNode;
  ton?: Ton;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">{principal}</p>
        {secondaire && (
          <p className="truncate text-xs text-neutral-400">{secondaire}</p>
        )}
      </div>
      {valeur != null && (
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${TONS_STAT[ton]}`}>
          {valeur}
        </span>
      )}
    </div>
  );
}

/** Séparateur fin entre lignes. */
export function ListeDivisee({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-neutral-100 dark:divide-neutral-800">{children}</div>;
}
