"use client";

import { useActionState } from "react";
import { BoutonPrincipal, Champ, MessageFormulaire } from "@/app/components/ui";
import { creerTypeVehicule } from "./actions";

export default function FormulaireAjoutType() {
  const [etat, action, enCours] = useActionState(creerTypeVehicule, undefined);

  return (
    <>
      <form action={action} className="grid grid-cols-2 gap-3">
        <Champ label="Nom du type" name="nom" required autoFocus placeholder="SHACMAN VTT…" />
        <Champ label="Marque (facultatif)" name="marque" placeholder="SHACMAN…" />
        <div className="col-span-2">
          <BoutonPrincipal type="submit" disabled={enCours}>
            {enCours ? "Ajout…" : "Ajouter ce type de véhicule"}
          </BoutonPrincipal>
        </div>
      </form>
      <MessageFormulaire erreur={etat?.erreur} succes={etat?.succes} />
    </>
  );
}
