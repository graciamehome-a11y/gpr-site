import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { libellePiece, libelleTypeVehicule } from "@/lib/libelles";
import { changerStatutVehicule } from "./actions";
import { Aide, Carte, Conteneur, EtatVide, TitrePage } from "@/app/components/ui";
import { IlluVehicules } from "@/app/components/illustrations";
import ChoixStatut from "@/app/components/ChoixStatut";
import FormulaireVehicule from "./FormulaireVehicule";
import FormulaireUtilisation from "./FormulaireUtilisation";

type Vehicule = {
  id: number;
  immatriculation: string;
  statut: string;
  types_vehicules: { nom: string } | null;
  sites: { nom: string } | null;
};

type Piece = {
  id: number;
  nom: string;
  types_vehicules: { nom: string } | null;
};

type Utilisation = {
  id: number;
  quantite: number;
  date_utilisation: string;
  utilisateur_nom: string | null;
  vehicules: { immatriculation: string } | null;
  pieces: { nom: string; types_vehicules: { nom: string } | null } | null;
};

const STATUTS: { valeur: string; label: string }[] = [
  { valeur: "arrive", label: "Arrivé" },
  { valeur: "en_reparation", label: "En réparation" },
  { valeur: "transfere", label: "Transféré" },
  { valeur: "pret", label: "Prêt" },
];

export default async function Vehicules() {
  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();
  const vueGlobale = aVueGlobale(utilisateur);

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id, immatriculation, statut, types_vehicules(nom), sites(nom)")
    .order("id", { ascending: false })
    .returns<Vehicule[]>();

  const { data: types } = await supabase.from("types_vehicules").select("id, nom").order("nom");
  const { data: sites } = vueGlobale
    ? await supabase.from("sites").select("id, nom").order("nom")
    : { data: null };
  const { data: pieces } = await supabase
    .from("pieces")
    .select("id, nom, types_vehicules(nom)")
    .order("nom")
    .returns<Piece[]>();

  const { data: utilisations } = await supabase
    .from("pieces_utilisees")
    .select(
      "id, quantite, date_utilisation, utilisateur_nom, vehicules(immatriculation), pieces(nom, types_vehicules(nom))",
    )
    .order("date_utilisation", { ascending: false })
    .limit(20)
    .returns<Utilisation[]>();

  return (
    <Conteneur>
      <TitrePage titre="Véhicules" icone="vehicules" description="Arrivées, statuts et pièces utilisées." />

      <Aide titre="À quoi sert cette page ?">
        <p>
          Elle suit la vie d&apos;un véhicule au garage, en commençant par son{" "}
          <strong>arrivée</strong>. Une fois enregistré, son statut se fait avancer d&apos;un tap :{" "}
          <strong>Arrivé → En réparation → Transféré → Prêt</strong>.
        </p>
        <p>
          Ensuite, chaque pièce posée sur le véhicule se déclare dans{" "}
          <strong>« Pièce utilisée »</strong>. C&apos;est ce geste qui{" "}
          <strong>retire la quantité du stock</strong> du site où se trouve le véhicule —
          vous n&apos;avez rien à décompter vous-même.
        </p>
        <p>
          C&apos;est aussi cet historique qui permet à un autre technicien de reprendre le travail
          sans redemander ce qui a déjà été fait.
        </p>
      </Aide>

      <FormulaireVehicule
        types={types ?? []}
        sites={sites ?? null}
        siteId={utilisateur?.site_id ?? null}
      />

      {vehicules && vehicules.length === 0 && (
        <EtatVide
          illustration={<IlluVehicules size={150} />}
          titre="Aucun véhicule enregistré"
          description="Enregistrez une arrivée avec le formulaire ci-dessus : le véhicule apparaîtra ici avec son statut, et vous pourrez lui associer les pièces posées."
        />
      )}

      <ul className="mb-8 space-y-2">
        {vehicules?.map((v) => (
          <li key={v.id}>
            <Carte>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
                    {v.immatriculation}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {v.types_vehicules?.nom}
                    {vueGlobale && v.sites?.nom ? ` · ${v.sites.nom}` : ""}
                  </p>
                </div>
              </div>
              <ChoixStatut
                id={v.id}
                statuts={STATUTS}
                actuel={v.statut}
                action={changerStatutVehicule}
              />
            </Carte>
          </li>
        ))}
      </ul>

      <FormulaireUtilisation
        vehicules={
          vehicules?.map((v) => ({
            id: v.id,
            label: v.immatriculation,
            sousLabel: v.types_vehicules?.nom,
          })) ?? []
        }
        pieces={
          pieces?.map((p) => ({
            id: p.id,
            label: p.nom,
            sousLabel: libelleTypeVehicule(p.types_vehicules),
          })) ?? []
        }
      />

      {utilisations && utilisations.length > 0 && (
        <ul className="space-y-2">
          {utilisations.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-1 text-sm">
              <span className="min-w-0 text-neutral-700 dark:text-neutral-300">
                <span className="block truncate">
                  {u.pieces ? libellePiece(u.pieces) : "Pièce supprimée"}
                </span>
                <span className="block truncate text-xs text-neutral-400">
                  {u.vehicules?.immatriculation}
                  {u.utilisateur_nom ? ` · ${u.utilisateur_nom}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-neutral-400">
                ×{u.quantite} — {new Date(u.date_utilisation).toLocaleDateString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Conteneur>
  );
}
