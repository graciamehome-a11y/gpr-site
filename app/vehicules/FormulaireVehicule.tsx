"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Astuce, BoutonPrincipal, Carte, Champ, MessageFormulaire, Selecteur, SousTitre } from "@/app/components/ui";
import { ajouterVehicule } from "./actions";

export default function FormulaireVehicule({
  types,
  sites,
  siteId,
}: {
  types: { id: number; nom: string }[];
  sites: { id: number; nom: string }[] | null;
  siteId: number | null;
}) {
  const [etat, action, enCours] = useActionState(ajouterVehicule, undefined);

  const aucunType = types.length === 0;

  return (
    <Carte className="mb-6">
      <SousTitre>Arrivée d&apos;un véhicule</SousTitre>
      <div className="mb-3">
        <Astuce>
          Une fois le véhicule enregistré, tapez directement sur un statut pour le faire
          avancer : <strong>Arrivé → En réparation → Transféré → Prêt</strong>.
        </Astuce>
      </div>

      {aucunType ? (
        <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center dark:border-neutral-800">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Aucun type de véhicule au catalogue.
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Un véhicule ne peut pas être enregistré sans son type. Commencez par là.
          </p>
          <Link
            href="/catalogue"
            className="mt-3 inline-block rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-700"
          >
            Ouvrir le catalogue
          </Link>
        </div>
      ) : (
        <form action={action} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Champ
              label="Immatriculation"
              name="immatriculation"
              required
              autoFocus
              placeholder="1234 AB 56…"
            />
          </div>
          <div className={sites ? "" : "col-span-2"}>
            <Selecteur label="Type" name="type_vehicule_id" required defaultValue="">
              <option value="" disabled>
                -- choisir --
              </option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </Selecteur>
          </div>
          {sites ? (
            <Selecteur label="Site" name="site_id" required defaultValue="">
              <option value="" disabled>
                -- choisir --
              </option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </Selecteur>
          ) : (
            <input type="hidden" name="site_id" value={siteId ?? ""} />
          )}
          <div className="col-span-2">
            <BoutonPrincipal type="submit" disabled={enCours}>
              {enCours ? "Enregistrement…" : "Enregistrer l'arrivée"}
            </BoutonPrincipal>
          </div>
        </form>
      )}

      <MessageFormulaire erreur={etat?.erreur} succes={etat?.succes} />
    </Carte>
  );
}
