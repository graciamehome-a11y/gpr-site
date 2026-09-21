import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { libelleMouvementStock, libellePiece, libelleTypeVehicule, mouvementEstSortie } from "@/lib/libelles";
import { Aide, Carte, Conteneur, EtatVide, TitrePage } from "@/app/components/ui";
import { IlluStock } from "@/app/components/illustrations";
import { Icone } from "@/app/components/icones";
import FormulaireStock from "./FormulaireStock";

type Site = { id: number; nom: string; type: string };
type LignePiece = { id: number; nom: string; types_vehicules: { nom: string } | null };
type LigneStock = { piece_id: number; quantite: number; seuil_alerte: number };
type Mouvement = {
  id: number;
  type: string;
  quantite: number;
  quantite_apres: number;
  date_mouvement: string;
  utilisateur_nom: string | null;
  pieces: { nom: string; types_vehicules: { nom: string } | null } | null;
  sites: { nom: string } | null;
};

const TYPES_SITE: Record<string, string> = {
  central: "Garage central",
  detachement: "Détachement",
  reserve: "Réserve",
};

export default async function StockDuSite({ params }: PageProps<"/stock/[site]">) {
  const { site } = await params;
  const siteId = Number(site);
  if (!Number.isInteger(siteId)) notFound();

  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();
  const vueGlobale = aVueGlobale(utilisateur);

  const { data: leSite } = await supabase
    .from("sites")
    .select("id, nom, type")
    .eq("id", siteId)
    .maybeSingle<Site>();

  if (!leSite) notFound();

  // Un rôle restreint n'a rien à faire sur le site d'un autre : on ne se
  // contente pas de masquer le lien, on refuse la page.
  if (!vueGlobale && utilisateur?.site_id !== siteId) notFound();

  const peutModifier = vueGlobale || utilisateur?.role === "chef_detachement";

  const [{ data: pieces }, { data: stocks }, { data: mouvements }, { data: sites }] =
    await Promise.all([
      supabase.from("pieces").select("id, nom, types_vehicules(nom)").order("nom").returns<LignePiece[]>(),
      supabase
        .from("stocks")
        .select("piece_id, quantite, seuil_alerte")
        .eq("site_id", siteId)
        .returns<LigneStock[]>(),
      supabase
        .from("mouvements_stock")
        .select(
          "id, type, quantite, quantite_apres, date_mouvement, utilisateur_nom, pieces(nom, types_vehicules(nom)), sites(nom)",
        )
        .eq("site_id", siteId)
        .order("date_mouvement", { ascending: false })
        .limit(20)
        .returns<Mouvement[]>(),
      supabase.from("sites").select("id, nom").neq("id", siteId).order("nom"),
    ]);

  const catalogue = pieces ?? [];
  const stockParPiece = new Map((stocks ?? []).map((s) => [s.piece_id, s]));

  const suivies = catalogue
    .map((p) => ({ piece: p, stock: stockParPiece.get(p.id) }))
    .filter((l): l is { piece: LignePiece; stock: LigneStock } => !!l.stock);

  const enAlerte = suivies.filter((l) => Number(l.stock.quantite) <= Number(l.stock.seuil_alerte));
  const normales = suivies.filter((l) => Number(l.stock.quantite) > Number(l.stock.seuil_alerte));
  const nonSuivies = catalogue.filter((p) => !stockParPiece.has(p.id));

  const optionsPieces = catalogue.map((p) => ({
    id: p.id,
    label: p.nom,
    sousLabel: libelleTypeVehicule(p.types_vehicules),
  }));

  return (
    <Conteneur>
      <Link
        href="/stock"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
      >
        <span className="rotate-180">
          <Icone nom="fleche" size={15} />
        </span>
        Tous les sites
      </Link>

      <TitrePage
        titre={leSite.nom}
        icone="stock"
        description={`${TYPES_SITE[leSite.type] ?? leSite.type} · ${suivies.length} référence${
          suivies.length > 1 ? "s" : ""
        } suivie${suivies.length > 1 ? "s" : ""}`}
      />

      {enAlerte.length > 0 && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {enAlerte.length} référence{enAlerte.length > 1 ? "s" : ""} au niveau du seuil
          d&apos;alerte ou en dessous.
        </p>
      )}

      <Aide titre="Comment lire cette page ?">
        <p>
          <strong>La quantité affichée est celle de {leSite.nom} uniquement.</strong> Elle diminue
          toute seule dès qu&apos;une pièce est déclarée utilisée sur un véhicule de ce site, et
          lorsqu&apos;un envoi part vers un autre site.
        </p>
        <p>
          <strong>Le seuil d&apos;alerte</strong> est le niveau plancher que vous fixez. Tant que la
          quantité reste au-dessus, tout va bien. Dès qu&apos;elle l&apos;atteint ou passe en
          dessous, la ligne s&apos;affiche en rouge.
        </p>
        <p>
          <strong>Une quantité négative</strong> signale qu&apos;une pièce a été utilisée avant que
          sa réception ait été saisie. Rien n&apos;est bloqué — c&apos;est justement le signal
          qu&apos;il faut corriger. Saisissez la quantité réellement présente sur l&apos;étagère et
          l&apos;écart disparaît.
        </p>
        <p>
          <strong>« Non suivi »</strong>, tout en bas, veut dire que la pièce existe au catalogue
          mais n&apos;a encore jamais été comptée sur ce site : sa quantité est considérée comme
          nulle.
        </p>
        <p>
          Chaque changement apparaît dans <strong>« Derniers mouvements »</strong>, avec qui l&apos;a
          fait et la quantité restante après l&apos;opération. C&apos;est ce qui permet de
          comprendre une variation sans avoir à chercher.
        </p>
      </Aide>

      {peutModifier && (
        <div className="mb-6">
          <FormulaireStock
            siteId={siteId}
            siteNom={leSite.nom}
            pieces={optionsPieces}
            autresSites={sites ?? []}
          />
        </div>
      )}

      {suivies.length === 0 ? (
        <EtatVide
          illustration={<IlluStock size={148} />}
          titre="Aucune quantité enregistrée sur ce site"
          description={
            peutModifier
              ? "Renseignez une première ligne avec le formulaire ci-dessus. Le catalogue complet est plus bas."
              : "Le stock de ce site apparaîtra ici dès qu'un responsable aura saisi une quantité."
          }
        />
      ) : (
        <ul className="mb-6 space-y-2">
          {[...enAlerte, ...normales].map(({ piece, stock }) => {
            const quantite = Number(stock.quantite);
            const seuil = Number(stock.seuil_alerte);
            const alerte = quantite <= seuil;
            const negatif = quantite < 0;
            return (
              <li key={piece.id}>
                <Carte
                  className={`flex items-center justify-between ${
                    alerte ? "border-red-200 dark:border-red-900" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
                      {piece.nom}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {libelleTypeVehicule(piece.types_vehicules)}
                      {seuil > 0 ? ` · seuil ${seuil}` : ""}
                    </p>
                    {negatif && (
                      <p className="mt-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                        Quantité négative — à corriger (le stock n&apos;a pas été mis à jour avant
                        la consommation)
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-[15px] font-semibold tabular-nums ${
                      alerte ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-white"
                    }`}
                  >
                    {quantite}
                  </span>
                </Carte>
              </li>
            );
          })}
        </ul>
      )}

      {mouvements && mouvements.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
            Derniers mouvements
          </h2>
          <Carte className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {mouvements.map((m) => {
              const sortie = mouvementEstSortie(m.type);
              return (
                <div key={m.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">
                      {m.pieces ? libellePiece(m.pieces) : "Pièce supprimée"}
                    </p>
                    <p className="truncate text-xs text-neutral-400">
                      {libelleMouvementStock(m.type)}
                      {m.sites?.nom ? ` · ${m.sites.nom}` : ""}
                      {m.utilisateur_nom ? ` · ${m.utilisateur_nom}` : ""} ·{" "}
                      {new Date(m.date_mouvement).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        sortie ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {sortie ? "−" : "+"}
                      {Number(m.quantite)}
                    </p>
                    <p className="text-xs text-neutral-400">reste {Number(m.quantite_apres)}</p>
                  </div>
                </div>
              );
            })}
          </Carte>
        </section>
      )}

      {nonSuivies.length > 0 && (
        <details className="rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <summary className="cursor-pointer select-none px-4 py-3.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Tout le catalogue ({catalogue.length} pièces) — dont {nonSuivies.length} sans quantité
            sur ce site
          </summary>
          <ul className="divide-y divide-neutral-100 border-t border-neutral-100 px-4 dark:divide-neutral-800 dark:border-neutral-800">
            {nonSuivies.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="min-w-0 truncate text-sm text-neutral-600 dark:text-neutral-400">
                  {p.nom}
                  <span className="ml-1.5 text-xs text-neutral-400">
                    {libelleTypeVehicule(p.types_vehicules)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-neutral-400">non suivi</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Conteneur>
  );
}
