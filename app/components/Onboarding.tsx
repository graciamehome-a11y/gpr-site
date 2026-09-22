import Link from "next/link";
import { Icone } from "@/app/components/icones";
import { IlluReseau } from "@/app/components/illustrations";

export type EtatDemarrage = {
  types: number;
  pieces: number;
  stocks: number;
  vehicules: number;
  bons: number;
};

type Etape = {
  titre: string;
  detail: string;
  href: string;
  fait: boolean;
  /** Nombre minimum requis avant de pouvoir passer à cette étape. */
  bloque?: boolean;
  blocage?: string;
};

/**
 * Parcours de démarrage, affiché tant que l'application n'est pas amorcée.
 *
 * L'ordre compte : un véhicule ne peut pas être enregistré sans type, une
 * réparation ne peut pas être déclarée sans pièce au catalogue. On présente
 * donc les étapes dans l'ordre où elles sont réellement franchissables, et on
 * grise celles dont la précédente n'est pas terminée — plutôt que de laisser
 * l'utilisateur buter sur un formulaire vide sans comprendre pourquoi.
 */
export default function Onboarding({
  etat,
  role,
}: {
  etat: EtatDemarrage;
  role: string;
}) {
  const etapes: Etape[] = [
    {
      titre: "Créer vos types de véhicules",
      detail:
        "Vos engins : SHACMAN VTT, VAB, KIA 450… Tout le reste s'y rattache, c'est donc la toute première étape.",
      href: "/catalogue",
      fait: etat.types > 0,
    },
    {
      titre: "Ajouter vos pièces au catalogue",
      detail:
        "Chaque pièce est rattachée à un véhicule. C'est ce qui évite de confondre deux pièces qui portent le même nom.",
      href: "/catalogue",
      fait: etat.pieces > 0,
      bloque: etat.types === 0,
      blocage: "Commencez par les types de véhicules.",
    },
    {
      titre: "Renseigner le stock d'un site",
      detail:
        "Ouvrez un site, puis saisissez les quantités présentes et leur seuil d'alerte.",
      href: "/stock",
      fait: etat.stocks > 0,
      bloque: etat.pieces === 0,
      blocage: "Ajoutez d'abord des pièces au catalogue.",
    },
    {
      titre: "Enregistrer une arrivée de véhicule",
      detail:
        "Immatriculation, type, site. Ensuite, chaque pièce posée dessus se déclare depuis la page Véhicules.",
      href: "/vehicules",
      fait: etat.vehicules > 0,
      bloque: etat.types === 0,
      blocage: "Commencez par les types de véhicules.",
    },
    {
      titre: "Créer un premier bon",
      detail:
        "La mémoire numérique de vos demandes de pièces. Le bon papier reste la référence pour les signatures.",
      href: "/bons",
      fait: etat.bons > 0,
      bloque: etat.pieces === 0 || etat.vehicules === 0,
      blocage: "Il faut au moins une pièce au catalogue et un véhicule enregistré.",
    },
  ];

  const faits = etapes.filter((e) => e.fait).length;
  const termine = faits === etapes.length;

  // Une fois le parcours terminé, on ne l'affiche plus : il a rempli son rôle.
  if (termine) return null;

  return (
    <section className="rounded-2xl border border-accent-200 bg-white shadow-sm shadow-neutral-950/[0.03] dark:border-accent-900 dark:bg-neutral-900">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-accent-500">
            <Icone nom="aide" size={16} />
          </span>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Pour démarrer
          </h2>
        </div>
        <span className="shrink-0 text-xs font-medium text-neutral-400">
          {faits}/{etapes.length}
        </span>
      </header>

      <div className="p-4">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <IlluReseau size={112} className="mx-auto shrink-0 sm:mx-0" />
          <p className="flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {faits === 0
              ? "L'application est vide : c'est normal, tout est à vous. Suivez les étapes dans l'ordre, elles prennent quelques minutes chacune."
              : `Bon départ — ${faits} étape${faits > 1 ? "s" : ""} sur ${etapes.length} déjà faite${faits > 1 ? "s" : ""}. Continuez dans l'ordre.`}
          </p>
        </div>

        <ol className="space-y-2">
          {etapes.map((etape, i) => {
            const bloque = etape.bloque && !etape.fait;
            const contenu = (
              <div
                className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                  etape.fait
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30"
                    : bloque
                      ? "border-neutral-200 opacity-55 dark:border-neutral-800"
                      : "border-accent-200 bg-accent-50/40 hover:border-accent-400 dark:border-accent-900 dark:bg-accent-950/20"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    etape.fait
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {etape.fait ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-medium ${
                      etape.fait
                        ? "text-emerald-800 line-through decoration-emerald-600/40 dark:text-emerald-300"
                        : "text-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    {etape.titre}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
                    {bloque ? etape.blocage : etape.detail}
                  </span>
                </span>
                {!etape.fait && !bloque && (
                  <span className="mt-1 shrink-0 text-accent-500">
                    <Icone nom="fleche" size={15} />
                  </span>
                )}
              </div>
            );

            return (
              <li key={etape.titre}>
                {etape.fait || bloque ? contenu : <Link href={etape.href}>{contenu}</Link>}
              </li>
            );
          })}
        </ol>

        <p className="mt-4 rounded-xl bg-neutral-50 px-3.5 py-2.5 text-xs leading-relaxed text-neutral-500 dark:bg-neutral-950">
          {role === "technicien" || role === "chef_detachement"
            ? "Le catalogue est du ressort du Garage Central et de la Comptable Matières. Si une pièce manque, signalez-le à un responsable."
            : "Vous pouvez aussi créer les comptes de vos équipes depuis la page Comptes : un mot de passe temporaire s'affiche, à leur transmettre."}
        </p>
      </div>
    </section>
  );
}
