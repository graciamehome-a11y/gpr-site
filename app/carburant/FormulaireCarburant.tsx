"use client";

import { useActionState } from "react";
import { Astuce, BoutonPrincipal, Carte, Selecteur, SousTitre } from "@/app/components/ui";
import ChampQuantite from "@/app/components/ChampQuantite";
import { ajouterMouvementCarburant } from "./actions";

export default function FormulaireCarburant({
  sites,
  siteId,
  choixSiteNecessaire,
}: {
  sites: { id: number; nom: string }[];
  siteId: number | null;
  choixSiteNecessaire: boolean;
}) {
  const [etat, action, enCours] = useActionState(ajouterMouvementCarburant, undefined);

  return (
    <Carte className="mb-6">
      <SousTitre>Nouveau mouvement</SousTitre>
      <div className="mb-3">
        <Astuce>
          <strong>Ravitaillement</strong> ajoute des litres, <strong>Consommation</strong> en
          retire. Le solde du détachement se recalcule tout seul.
        </Astuce>
      </div>
      <form action={action} className="grid grid-cols-2 gap-3">
        {choixSiteNecessaire ? (
          <div className="col-span-2">
            <Selecteur label="Détachement" name="site_id" required defaultValue="">
              <option value="" disabled>
                -- choisir --
              </option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </Selecteur>
          </div>
        ) : (
          <input type="hidden" name="site_id" value={siteId ?? ""} />
        )}
        <Selecteur label="Type" name="type" required defaultValue="gasoil">
          <option value="gasoil">Gasoil</option>
          <option value="essence">Essence</option>
        </Selecteur>
        <Selecteur label="Mouvement" name="mouvement" required defaultValue="ravitaillement">
          <option value="ravitaillement">Ravitaillement</option>
          <option value="consommation">Consommation</option>
        </Selecteur>
        <div className="col-span-2">
          <ChampQuantite
            name="quantite"
            label="Quantité (litres)"
            defaut={20}
            min={1}
            pas={5}
            presets={[10, 20, 50, 100]}
          />
        </div>
        <div className="col-span-2">
          <BoutonPrincipal type="submit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </BoutonPrincipal>
        </div>
      </form>

      {etat?.erreur && (
        <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-400" role="alert">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" role="status">
          {etat.succes}
        </p>
      )}
    </Carte>
  );
}
