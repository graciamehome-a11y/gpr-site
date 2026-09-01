import type { Metadata } from "next";
import { Conteneur } from "@/app/components/ui";
import { IlluReseau } from "@/app/components/illustrations";
import RetourEnLigne from "./RetourEnLigne";

export const metadata: Metadata = { title: "Hors ligne — GPR" };

export default function HorsLigne() {
  return (
    <Conteneur className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <IlluReseau size={160} />
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
        Vous êtes hors ligne
      </h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
        Cette page n&apos;a pas encore été chargée sur cet appareil. Les pages déjà visitées
        (accueil, stock, véhicules, bons, carburant) restent consultables sans réseau.
      </p>
      <RetourEnLigne />
    </Conteneur>
  );
}
