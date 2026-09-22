"use client";

import { useActionState, useState } from "react";
import { BoutonPrincipal, Champ, MessageFormulaire, Selecteur } from "@/app/components/ui";
import { creerPiece } from "./actions";

export default function FormulaireAjoutPiece({ types }: { types: { id: number; nom: string }[] }) {
  const [etat, action, enCours] = useActionState(creerPiece, undefined);
  const [typeChoisi, setTypeChoisi] = useState("");

  return (
    <>
      <form action={action} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Champ label="Nom de la pièce" name="nom" required autoFocus placeholder="Amortisseur AR…" />
        </div>
        <div className="col-span-2">
          <Selecteur
            label="Véhicule concerné"
            name="type_vehicule_id"
            value={typeChoisi}
            onChange={(e) => setTypeChoisi(e.target.value)}
          >
            <option value="">— Générique (lubrifiant, consommable) —</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </Selecteur>
        </div>
        <Champ label="Catégorie (facultatif)" name="categorie" placeholder="mécanique…" />
        <Champ label="Référence (facultatif)" name="reference" />
        <div className="col-span-2">
          <BoutonPrincipal type="submit" disabled={enCours}>
            {enCours ? "Ajout…" : "Ajouter au catalogue"}
          </BoutonPrincipal>
        </div>
      </form>
      <MessageFormulaire erreur={etat?.erreur} succes={etat?.succes} />
    </>
  );
}
