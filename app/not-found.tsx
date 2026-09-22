import Link from "next/link";
import { Icone } from "@/app/components/icones";

/**
 * Page affichée quand une adresse ne correspond à rien — ou, volontairement,
 * quand quelqu'un tente d'ouvrir le stock d'un site qui n'est pas le sien.
 *
 * On ne dit pas « accès refusé » : ce serait confirmer que la page existe. On
 * indique simplement que l'adresse est introuvable, avec une porte de sortie.
 */
export default function Introuvable() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <Icone nom="aide" size={26} />
      </span>

      <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        L&apos;adresse est peut-être incomplète, ou l&apos;élément a été déplacé. Si vous cherchiez
        le stock d&apos;un autre site, rappelez-vous que votre compte ne donne accès qu&apos;au
        vôtre.
      </p>

      <Link
        href="/"
        className="mt-6 w-full rounded-xl bg-accent-600 px-4 py-3 text-center text-[15px] font-medium text-white transition hover:bg-accent-700"
      >
        Revenir à l&apos;accueil
      </Link>
    </div>
  );
}
