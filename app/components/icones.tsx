import type { SVGProps } from "react";

/**
 * Jeu d'icônes maison — un seul trait, pas de remplissage, cohérent avec
 * l'illustration des états vides. Utilisé par la Navbar, les tableaux de bord
 * et les en-têtes de page pour garder un langage visuel unique.
 */

export type NomIcone =
  | "accueil"
  | "stock"
  | "vehicules"
  | "bons"
  | "carburant"
  | "comptes"
  | "alerte"
  | "horloge"
  | "fleche"
  | "plus"
  | "aide"
  | "sortie"
  | "cle";

const TRACES: Record<NomIcone, React.ReactNode> = {
  accueil: <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />,
  stock: <path d="M21 8 12 3 3 8l9 5 9-5Zm0 0v8l-9 5-9-5V8m18 0-9 5m0 0L3 8m9 5v8" />,
  vehicules: (
    <path d="M3 17h1a2 2 0 0 0 4 0h8a2 2 0 0 0 4 0h1v-5l-3-4H7L3 12v5Zm4-1h10M5 12h13" />
  ),
  bons: (
    <path d="M8 3h6l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm5 0v5h5M9 12h6M9 16h6M9 8h2" />
  ),
  carburant: (
    <path d="M4 21V8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v13M3 21h10m2-13 2.5 2.5a1 1 0 0 1 .3.7V17a1.5 1.5 0 0 0 3 0v-4.5L17 8M6 11h4" />
  ),
  comptes: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />,
  alerte: <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  horloge: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  fleche: <path d="M5 12h14m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  aide: <path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.5-1.6 1.4-1.6 2.4v.5m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  sortie: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />,
  cle: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
};

export function Icone({
  nom,
  size = 20,
  ...props
}: { nom: NomIcone; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {TRACES[nom]}
    </svg>
  );
}
