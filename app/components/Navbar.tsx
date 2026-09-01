import Link from "next/link";
import {
  accesCarburant,
  aVueGlobale,
  getUtilisateurConnecte,
} from "@/lib/getUtilisateurConnecte";
import { deconnexion } from "@/app/login/actions";
import { Icone } from "@/app/components/icones";
import { NavLiensDesktop, NavLiensMobile, type LienNav } from "@/app/components/NavLiens";

export default async function Navbar() {
  const utilisateur = await getUtilisateurConnecte();
  if (!utilisateur) return null;

  const liens: LienNav[] = (
    [
      { href: "/", label: "Accueil", icone: "accueil", visible: true },
      { href: "/stock", label: "Stock", icone: "stock", visible: true },
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
        icone: "comptes",
        visible: aVueGlobale(utilisateur),
      },
    ] as (LienNav & { visible: boolean })[]
  )
    .filter((l) => l.visible)
    .map(({ href, label, icone }) => ({ href, label, icone }));

  return (
    <>
      {/* Barre du haut : identité + déconnexion (toujours visible) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200/80 bg-white/80 px-4 py-3 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/80">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
            <Icone nom="cle" size={15} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-white">
            GPR
          </span>
        </Link>

        <NavLiensDesktop liens={liens} />

        <div className="flex items-center gap-1.5">
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
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
          >
            <Icone nom="aide" size={17} />
          </Link>
          <form action={deconnexion}>
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <Icone nom="sortie" size={17} />
            </button>
          </form>
        </div>
      </header>

      {/* Barre du bas : navigation rapide, mobile uniquement — "tap tap go".
          « Comptes » en est exclu (action d'admin rare, accessible depuis le haut
          et le tableau de bord) pour garder 5 cibles larges au maximum. */}
      <NavLiensMobile liens={liens.filter((l) => l.href !== "/admin/comptes")} />
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
