"use client";

import { useActionState } from "react";
import { BoutonPrincipal, Champ, Selecteur } from "@/app/components/ui";
import { creerCompte } from "./actions";
import AffichageMotDePasse from "./AffichageMotDePasse";

export default function FormulaireCompte({
  roles,
  sites,
}: {
  /** `libelle` est calculé côté serveur : les libellés dépendent du rôle technique. */
  roles: { id: number; libelle: string }[];
  sites: { id: number; nom: string }[];
}) {
  const [etat, action, enCours] = useActionState(creerCompte, undefined);

  return (
    <>
      <form action={action} className="grid grid-cols-2 gap-3">
        <Champ label="Prénom" name="prenom" required autoFocus />
        <Champ label="Nom" name="nom" required />
        <div className="col-span-2">
          <Champ label="Email" name="email" type="email" required />
        </div>
        <div className="col-span-2">
          <Selecteur label="Rôle" name="role_id" required defaultValue="">
            <option value="" disabled>
              -- choisir --
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.libelle}
              </option>
            ))}
          </Selecteur>
        </div>
        <div className="col-span-2">
          <Selecteur label="Site (si applicable)" name="site_id" defaultValue="">
            <option value="">— aucun (vue globale) —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </Selecteur>
        </div>
        <div className="col-span-2">
          <BoutonPrincipal type="submit" disabled={enCours}>
            {enCours ? "Création…" : "Créer le compte"}
          </BoutonPrincipal>
        </div>
      </form>

      {etat?.erreur && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {etat.erreur}
        </p>
      )}

      {etat?.motDePasse && etat.email && (
        <AffichageMotDePasse
          motDePasse={etat.motDePasse}
          email={etat.email}
          reinitialisation={etat.reinitialisation}
        />
      )}
    </>
  );
}
