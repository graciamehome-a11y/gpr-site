import Link from "next/link";
import {
  accesCarburant,
  aVueGlobale,
  getUtilisateurConnecte,
} from "@/lib/getUtilisateurConnecte";
import { deconnexion } from "@/app/login/actions";

const ICONES: Record<string, React.ReactNode> = {
  stock: (
    <path d="M21 8 12 3 3 8l9 5 9-5Zm0 0v8l-9 5-9-5V8m18 0-9 5m0 0L3 8m9 5v8" />
  ),
  vehicules: (
    <path d="M3 17h1a2 2 0 0 0 4 0h8a2 2 0 0 0 4 0h1v-5l-3-4H7L3 12v5Zm4-1h10M5 12h13" />
  ),
  bons: (
    <path d="M8 3h6l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm5 0v5h5M9 12h6M9 16h6M9 8h2" />
  ),
  carburant: (
    <path d="M4 21V8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v13M3 21h10m2-13 2.5 2.5a1 1 0 0 1 .3.7V17a1.5 1.5 0 0 0 3 0v-4.5L17 8M6 11h4" />
  ),
  admin: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
  ),
};

function Icone({ nom }: { nom: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONES[nom]}
    </svg>
  );
}

export default async function Navbar() {
  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return null;

  const liens = [
    { href: "/", label: "Stock", icone: "stock", visible: true },
    { href: "/vehicules", label: "Véhicules", icone: "vehicules", visible: true },
    { href: "/bons", label: "Bons", icone: "bons", visible: true },
    {
      href: "/carburant",
      label: "Carburant",
      icone: "carburant",
      visible: accesCarburant(utilisateur),
    },
    {
      href: "/admin/comptes",
      label: "Comptes",
      icone: "admin",
      visible: aVueGlobale(utilisateur),
    },
  ].filter((l) => l.visible);

  return (
    <>
      {/* Barre du haut : identité + déconnexion (toujours visible) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <Link href="/" className="text-[15px] font-semibold text-neutral-900 dark:text-white">
          GPR
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {liens.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight text-neutral-900 dark:text-white">
              {utilisateur.prenom} {utilisateur.nom}
            </p>
            <p className="text-xs leading-tight text-neutral-500">
              {libelleRole(utilisateur.role)}
              {utilisateur.site_nom ? ` · ${utilisateur.site_nom}` : ""}
            </p>
          </div>
          <Link
            href="/e"
            aria-label="Comment ça marche"
            title="Comment ça marche"
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
          >
            ?
          </Link>
          <form action={deconnexion}>
            <button
              type="submit"
              className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              Quitter
            </button>
          </form>
        </div>
      </header>

      {/* Barre du bas : navigation rapide, mobile uniquement — "tap tap go" */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 bg-white/95 backdrop-blur sm:hidden dark:border-neutral-800 dark:bg-neutral-950/95">
        {liens.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-neutral-500 active:text-neutral-900 dark:active:text-white"
          >
            <Icone nom={l.icone} />
            <span className="text-[11px]">{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

function libelleRole(role: string) {
  const labels: Record<string, string> = {
    technicien: "Technicien",
    chef_detachement: "Chef de détachement",
    chef_garage: "Chef Garage",
    comptable_matieres: "Comptable Matières",
    chef_service_technique: "Chef Service Technique",
  };
  return labels[role] ?? role;
}
