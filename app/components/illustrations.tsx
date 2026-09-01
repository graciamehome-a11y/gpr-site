/**
 * Illustrations au trait — un seul style : pas de remplissage, `currentColor`
 * pour le tracé principal, la classe `.accent` pour un détail mis en valeur.
 * Pensées pour accompagner un texte court (états vides, en-tête de guide).
 */

type Props = { className?: string; size?: number };

function base(size: number) {
  return {
    width: size,
    height: (size * 3) / 4,
    viewBox: "0 0 160 120",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

/** Tableau de bord : un panneau avec des barres. */
export function IlluTableau({ className = "", size = 160 }: Props) {
  return (
    <svg {...base(size)} className={`text-neutral-300 dark:text-neutral-700 ${className}`}>
      <rect x="18" y="20" width="124" height="80" rx="8" />
      <path d="M18 40h124" />
      <path className="accent text-accent-500" d="M40 84V60M62 84V50M84 84V66M106 84V44" strokeWidth="4" />
      <circle cx="30" cy="30" r="2.5" />
      <circle cx="40" cy="30" r="2.5" />
    </svg>
  );
}

/** Stock : rayonnage avec cartons. */
export function IlluStock({ className = "", size = 160 }: Props) {
  return (
    <svg {...base(size)} className={`text-neutral-300 dark:text-neutral-700 ${className}`}>
      <path d="M20 26h120M20 62h120M20 98h120M28 26v72M132 26v72" />
      <rect x="40" y="34" width="26" height="22" rx="2" />
      <rect x="78" y="34" width="30" height="22" rx="2" />
      <rect className="accent text-accent-500" x="46" y="70" width="30" height="22" rx="2" />
      <rect x="92" y="70" width="24" height="22" rx="2" />
    </svg>
  );
}

/** Véhicule : camion de profil. */
export function IlluVehicules({ className = "", size = 160 }: Props) {
  return (
    <svg {...base(size)} className={`text-neutral-300 dark:text-neutral-700 ${className}`}>
      <path d="M16 80V44a4 4 0 0 1 4-4h60a4 4 0 0 1 4 4v36" />
      <path d="M84 56h28l16 18v6H84z" />
      <path d="M8 80h136" />
      <circle className="accent text-accent-500" cx="48" cy="88" r="10" />
      <circle className="accent text-accent-500" cx="116" cy="88" r="10" />
    </svg>
  );
}

/** Bon : feuille avec coche. */
export function IlluBons({ className = "", size = 160 }: Props) {
  return (
    <svg {...base(size)} className={`text-neutral-300 dark:text-neutral-700 ${className}`}>
      <path d="M46 14h44l24 24v68a4 4 0 0 1-4 4H46a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
      <path d="M90 14v24h24" />
      <path d="M58 62h44M58 78h32" />
      <path className="accent text-accent-500" d="m58 44 6 6 12-12" />
    </svg>
  );
}

/** Carburant : nourrice avec bouchon. */
export function IlluCarburant({ className = "", size = 160 }: Props) {
  return (
    <svg {...base(size)} className={`text-neutral-300 dark:text-neutral-700 ${className}`}>
      <path d="M44 40h44a6 6 0 0 1 6 6v54a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V46a6 6 0 0 1 6-6Z" />
      <path d="M58 40v-6h16v6" />
      <path d="M94 58h12l10 10v26" />
      <path className="accent text-accent-500" d="M54 70h24M66 70v22" strokeWidth="4" />
    </svg>
  );
}

/** Bienvenue : un site relié à deux détachements. */
export function IlluReseau({ className = "", size = 160 }: Props) {
  return (
    <svg {...base(size)} className={`text-neutral-300 dark:text-neutral-700 ${className}`}>
      <path d="M80 34 40 84M80 34l40 50" />
      <circle className="accent text-accent-500" cx="80" cy="30" r="12" />
      <circle cx="36" cy="90" r="12" />
      <circle cx="124" cy="90" r="12" />
    </svg>
  );
}
