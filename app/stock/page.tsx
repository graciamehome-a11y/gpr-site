import Link from "next/link";
import { supabaseServeur } from "@/lib/supabaseServerClient";
import { aVueGlobale, getUtilisateurConnecte } from "@/lib/getUtilisateurConnecte";
import { Aide, Carte, Conteneur, EtatVide, TitrePage } from "@/app/components/ui";
import { IlluStock } from "@/app/components/illustrations";
import { Icone } from "@/app/components/icones";

type Site = { id: number; nom: string; type: string };
type LigneStock = { quantite: number; seuil_alerte: number; site_id: number };

export const metadata = { title: "Stock — GPR" };

const TYPES_SITE: Record<string, string> = {
  central: "Garage central",
  detachement: "Détachement",
  reserve: "Réserve",
};

/**
 * Accueil du module Stock : on choisit d'abord un site, puis on voit son
 * détail. Un grand tableau unique mélangeant tous les sites ne permettait pas
 * de répondre à la question qu'on se pose réellement — « qu'est-ce qu'il y a
 * ici ? ».
 *
 * Le filtrage des sites est fait ici, et pas seulement par les RLS : la table
 * `sites` est lisible par tout compte connecté (elle ne contient que quatre
 * noms), donc un technicien verrait les quatre cartes sans ce tri.
 */
export default async function Stock() {
  const supabase = await supabaseServeur();
  const utilisateur = await getUtilisateurConnecte();
  const vueGlobale = aVueGlobale(utilisateur);

  const { data: tousLesSites } = await supabase
    .from("sites")
    .select("id, nom, type")
    .order("id")
    .returns<Site[]>();

  const sites = (tousLesSites ?? []).filter(
    (s) => vueGlobale || s.id === utilisateur?.site_id,
  );

  // Les RLS limitent déjà cette lecture aux sites autorisés.
  const { data: stocks } = await supabase
    .from("stocks")
    .select("quantite, seuil_alerte, site_id")
    .returns<LigneStock[]>();

  const parSite = new Map<number, { references: number; alertes: number; negatives: number }>();
  for (const ligne of stocks ?? []) {
    const cumul = parSite.get(ligne.site_id) ?? { references: 0, alertes: 0, negatives: 0 };
    cumul.references += 1;
    if (Number(ligne.quantite) <= Number(ligne.seuil_alerte)) cumul.alertes += 1;
    if (Number(ligne.quantite) < 0) cumul.negatives += 1;
    parSite.set(ligne.site_id, cumul);
  }

  const totalAlertes = [...parSite.values()].reduce((n, s) => n + s.alertes, 0);

  return (
    <Conteneur>
      <TitrePage
        titre="Stock"
        icone="stock"
        description={
          vueGlobale
            ? "Choisissez un site pour voir son stock."
            : utilisateur?.site_nom
              ? `Le stock de ${utilisateur.site_nom}.`
              : undefined
        }
      />

      {totalAlertes > 0 && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {totalAlertes} référence{totalAlertes > 1 ? "s" : ""} au niveau du seuil d&apos;alerte ou
          en dessous.
        </p>
      )}

      <Aide titre="Comment ça marche ?">
        <p>
          Le stock est rangé <strong>par site</strong> : chaque site a ses propres quantités, même
          pour une pièce identique. Touchez un site pour voir tout ce qu&apos;il contient.
        </p>
        <p>
          Sur chaque carte : le nombre de <strong>références en stock</strong> (les pièces déjà
          comptées sur ce site), et en rouge le nombre de celles qui ont atteint leur seuil
          d&apos;alerte.
        </p>
        {!vueGlobale && (
          <p>
            Votre compte est rattaché à un seul site : vous ne voyez donc que le vôtre. C&apos;est
            normal.
          </p>
        )}
      </Aide>

      {sites.length === 0 ? (
        <EtatVide
          illustration={<IlluStock size={148} />}
          titre="Aucun site rattaché à votre compte"
          description="Votre compte n'est associé à aucun site : contactez un responsable pour corriger cela."
        />
      ) : (
        <ul className="space-y-2">
          {sites.map((site) => {
            const cumul = parSite.get(site.id) ?? { references: 0, alertes: 0, negatives: 0 };
            return (
              <li key={site.id}>
                <Link href={`/stock/${site.id}`} className="block">
                  <Carte className="flex items-center justify-between transition hover:border-accent-300 active:scale-[0.99] dark:hover:border-accent-800">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-neutral-900 dark:text-white">
                        {site.nom}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {TYPES_SITE[site.type] ?? site.type} · {cumul.references} référence
                        {cumul.references > 1 ? "s" : ""} en stock
                      </p>
                      {cumul.alertes > 0 && (
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                          {cumul.alertes} en alerte
                          {cumul.negatives > 0 ? ` · ${cumul.negatives} à corriger` : ""}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-neutral-300 dark:text-neutral-600">
                      <Icone nom="fleche" size={18} />
                    </span>
                  </Carte>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Conteneur>
  );
}
