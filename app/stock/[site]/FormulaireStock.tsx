"use client";

import { useActionState } from "react";
import { Astuce, BoutonPrincipal, Carte, Selecteur, SousTitre } from "@/app/components/ui";
import ChampPiece from "@/app/components/ChampPiece";
import ChampQuantite from "@/app/components/ChampQuantite";
import { MessageFormulaire } from "@/app/components/ui";
import { definirStock, transfererStock, type EtatStock } from "../actions";

type Option = { id: number; label: string; sousLabel?: string };

function Message({ etat }: { etat: EtatStock }) {
  return <MessageFormulaire erreur={etat?.erreur} succes={etat?.succes} />;
}

export default function FormulaireStock({
  siteId,
  siteNom,
  pieces,
  autresSites,
}: {
  siteId: number;
  siteNom: string;
  pieces: Option[];
  autresSites: { id: number; nom: string }[];
}) {
  const [etatStock, actionStock, stockEnCours] = useActionState(definirStock, undefined);
  const [etatTransfert, actionTransfert, transfertEnCours] = useActionState(
    transfererStock,
    undefined,
  );

  return (
    <div className="space-y-4">
      <Carte>
        <SousTitre>Mettre à jour une quantité</SousTitre>
        <div className="mb-3">
          <Astuce>
            La quantité saisie <strong>remplace</strong> celle du site. Le{" "}
            <strong>seuil d&apos;alerte</strong> est le niveau plancher : dès qu&apos;il est
            atteint, la pièce s&apos;affiche en rouge. Chaque changement est conservé dans
            l&apos;historique ci-dessous.
          </Astuce>
        </div>
        <form action={actionStock} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="site_id" value={siteId} />
          <div className="col-span-2">
            <ChampPiece
              label="Pièce"
              name="piece_id"
              required
              storageKey="recents-pieces-stock"
              options={pieces}
            />
          </div>
          <ChampQuantite name="quantite" label="Quantité" defaut={0} min={0} />
          <ChampQuantite name="seuil_alerte" label="Seuil d'alerte" defaut={0} min={0} />
          <div className="col-span-2">
            <BoutonPrincipal type="submit" disabled={stockEnCours}>
              {stockEnCours ? "Enregistrement…" : "Enregistrer"}
            </BoutonPrincipal>
          </div>
        </form>
        <Message etat={etatStock} />
      </Carte>

      {autresSites.length > 0 && (
        <Carte>
          <SousTitre>Envoyer vers un autre site</SousTitre>
          <div className="mb-3">
            <Astuce>
              La quantité part du stock de <strong>{siteNom}</strong> et vient s&apos;ajouter à
              celui du site choisi. Les deux mouvements sont enregistrés d&apos;un seul coup.
            </Astuce>
          </div>
          <form action={actionTransfert} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="site_id" value={siteId} />
            <div className="col-span-2">
              <ChampPiece
                label="Pièce à envoyer"
                name="piece_id"
                required
                storageKey="recents-pieces-transfert"
                options={pieces}
              />
            </div>
            <div className="col-span-2">
              <Selecteur label="Vers le site" name="site_destination_id" required defaultValue="">
                <option value="" disabled>
                  -- choisir --
                </option>
                {autresSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </Selecteur>
            </div>
            <div className="col-span-2">
              <ChampQuantite name="quantite" label="Quantité à envoyer" defaut={1} min={1} />
            </div>
            <div className="col-span-2">
              <BoutonPrincipal type="submit" variante="accent" disabled={transfertEnCours}>
                {transfertEnCours ? "Envoi…" : "Envoyer"}
              </BoutonPrincipal>
            </div>
          </form>
          <Message etat={etatTransfert} />
        </Carte>
      )}
    </div>
  );
}
