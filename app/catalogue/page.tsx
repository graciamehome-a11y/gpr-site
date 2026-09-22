import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { Aide, Carte, Conteneur, EtatVide, SousTitre, TitrePage } from "@/app/components/ui";
import { IlluStock } from "@/app/components/illustrations";
import { Icone } from "@/app/components/icones";
import LigneType, { type TypeAffiche } from "./LigneType";
import LignePiece, { type PieceAffichee } from "./LignePiece";
import FormulaireAjoutType from "./FormulaireAjoutType";
import FormulaireAjoutPiece from "./FormulaireAjoutPiece";

type Type = { id: number; nom: string; marque: string | null };
type Piece = {
  id: number;
  nom: string;
  categorie: string | null;
  reference: string | null;
  type_vehicule_id: number | null;
};

/**
 * Catalogue : les types de véhicules et les pièces.
 *
 * C'est le référentiel de toute l'application. Il est modifiable ici parce que
 * sans lui rien n'est possible : un véhicule ne peut pas être enregistré sans
 * son type, et une pièce ne peut pas être déclarée si elle n'est pas au
 * catalogue.
 */
export default async function Catalogue() {
  const utilisateur = await getUtilisateurConnecte();
  if (!aVueGlobale(utilisateur)) redirect("/");

  const supabase = await supabaseServeur();
  const [{ data: types }, { data: pieces }, { data: vehicules }] = await Promise.all([
    supabase.from("types_vehicules").select("id, nom, marque").order("nom").returns<Type[]>(),
    supabase
      .from("pieces")
      .select("id, nom, categorie, reference, type_vehicule_id")
      .order("nom")
      .returns<Piece[]>(),
    supabase.from("vehicules").select("type_vehicule_id").returns<{ type_vehicule_id: number | null }[]>(),
  ]);

  const listeTypes = types ?? [];
  const listePieces = pieces ?? [];

  const typesAffiches: TypeAffiche[] = listeTypes.map((t) => ({
    ...t,
    nbPieces: listePieces.filter((p) => p.type_vehicule_id === t.id).length,
    nbVehicules: (vehicules ?? []).filter((v) => v.type_vehicule_id === t.id).length,
  }));

  const generiques = listePieces.filter((p) => p.type_vehicule_id === null);
  const parType = listeTypes
    .map((t) => ({ type: t, pieces: listePieces.filter((p) => p.type_vehicule_id === t.id) }))
    .filter((g) => g.pieces.length > 0);

  return (
    <Conteneur>
      <Link
        href="/stock"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
      >
        <span className="rotate-180">
          <Icone nom="fleche" size={15} />
        </span>
        Retour au stock
      </Link>

      <TitrePage
        titre="Catalogue"
        icone="stock"
        description={`${listePieces.length} pièce${listePieces.length > 1 ? "s" : ""} · ${listeTypes.length} type${listeTypes.length > 1 ? "s" : ""} de véhicule`}
      />

      <Aide titre="À quoi sert le catalogue ?">
        <p>
          C&apos;est le <strong>référentiel de toute l&apos;application</strong>. Sans lui, rien
          n&apos;est possible : un véhicule ne peut pas être enregistré sans son type, et une pièce
          ne peut pas être déclarée si elle n&apos;est pas ici.
        </p>
        <p>
          <strong>Le type de véhicule est ce qui distingue deux pièces de même nom.</strong> Un
          « Amortisseur AR » de CSK n&apos;est pas celui d&apos;un LAND-CRUISER : en les rattachant
          chacun à son type, on évite la confusion au moment de servir ou de commander.
        </p>
        <p>
          Une pièce <strong>sans type</strong> est dite « générique » : filtres, batteries, huiles —
          des consommables qui vont sur plusieurs engins. C&apos;est normal et voulu.
        </p>
        <p>
          Touchez une ligne pour la <strong>modifier</strong> ou la <strong>supprimer</strong>. Une
          suppression est refusée si l&apos;élément est déjà utilisé dans un stock, un véhicule ou un
          historique.
        </p>
      </Aide>

      {/* ------------------------------------------------ Types de véhicules */}
      <Carte className="mb-6">
        <SousTitre>Types de véhicules</SousTitre>
        <p className="mb-3 text-xs leading-relaxed text-neutral-500">
          À remplir <strong>en premier</strong> : les pièces et les véhicules s&apos;y rattachent.
        </p>
        <FormulaireAjoutType />
      </Carte>

      {typesAffiches.length === 0 ? (
        <EtatVide
          illustration={<IlluStock size={140} />}
          titre="Aucun type de véhicule"
          description="Commencez par là : ajoutez vos engins (SHACMAN VTT, VAB, KIA 450…). Sans eux, aucun véhicule ne peut être enregistré."
        />
      ) : (
        <ul className="mb-8 space-y-2">
          {typesAffiches.map((t) => (
            <li key={t.id}>
              <LigneType type={t} />
            </li>
          ))}
        </ul>
      )}

      {/* ----------------------------------------------------------- Pièces */}
      <Carte className="mb-6">
        <SousTitre>Ajouter une pièce</SousTitre>
        <FormulaireAjoutPiece types={listeTypes.map((t) => ({ id: t.id, nom: t.nom }))} />
      </Carte>

      {listePieces.length === 0 ? (
        <EtatVide
          illustration={<IlluStock size={140} />}
          titre="Aucune pièce au catalogue"
          description="Ajoutez vos pièces une par une, en précisant le véhicule concerné. Elles seront ensuite disponibles dans le stock, les véhicules et les bons."
        />
      ) : (
        <div className="space-y-6">
          {parType.map((groupe) => (
            <section key={groupe.type.id}>
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
                {groupe.type.nom} · {groupe.pieces.length} pièce
                {groupe.pieces.length > 1 ? "s" : ""}
              </h2>
              <ul className="space-y-2">
                {groupe.pieces.map((p) => (
                  <li key={p.id}>
                    <LignePiece piece={p as PieceAffichee} types={listeTypes} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {generiques.length > 0 && (
            <section>
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
                Génériques · {generiques.length} pièce{generiques.length > 1 ? "s" : ""}
              </h2>
              <ul className="space-y-2">
                {generiques.map((p) => (
                  <li key={p.id}>
                    <LignePiece piece={p as PieceAffichee} types={listeTypes} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Conteneur>
  );
}
