"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomIcone } from "@/app/components/icones";

export type LienNav = { href: string; label: string; icone: NomIcone };

function estActif(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Liens de navigation — barre texte en haut (desktop), barre d'icônes en bas (mobile). */
export function NavLiensDesktop({ liens }: { liens: LienNav[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {liens.map((l) => {
        const actif = estActif(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actif ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              actif
                ? "bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavLiensMobile({ liens }: { liens: LienNav[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-neutral-800 dark:bg-neutral-950/95">
      {liens.map((l) => {
        const actif = estActif(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actif ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
              actif
                ? "text-accent-600 dark:text-accent-300"
                : "text-neutral-400 active:text-neutral-900 dark:active:text-white"
            }`}
          >
            {actif && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent-600 dark:bg-accent-300" />
            )}
            <Icone nom={l.icone} size={20} />
            <span className="text-[11px] font-medium">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
