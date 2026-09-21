import Link from "next/link";
import { Icone } from "@/app/components/icones";

/**
 * Aide à la récupération d'accès.
 *
 * Cette page ne collecte volontairement aucune adresse email : l'envoi
 * automatique n'est pas encore activé sur ce service, et un formulaire qui
 * répondrait « un email vient de vous être envoyé » alors que rien ne part
 * laisserait la personne attendre indéfiniment. On explique donc directement
 * la démarche qui fonctionne.
 *
 * Si un service d'envoi est configuré plus tard, cette page redeviendra un
 * formulaire de réinitialisation — le code de l'action serveur correspondante
 * est conservé dans l'historique Git.
 */
export default function MotDePasseOublie() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Voici comment récupérer votre accès.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm shadow-neutral-950/[0.04] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
          <p className="mb-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            L&apos;envoi automatique d&apos;emails n&apos;est pas encore activé sur ce service. La
            récupération se fait donc avec l&apos;aide d&apos;un responsable.
          </p>

          <ol className="space-y-3.5">
            {[
              {
                titre: "Contactez un responsable",
                detail:
                  "Un Chef Garage, un Comptable Matières ou un Chef Service Technique. Ce sont les rôles qui gèrent les comptes.",
              },
              {
                titre: "Demandez-lui un nouveau mot de passe",
                detail:
                  "Depuis la page « Comptes », il clique sur « Réinitialiser le mot de passe » en face de votre nom. Un mot de passe temporaire s'affiche : il vous le lit ou vous le transmet.",
              },
              {
                titre: "Connectez-vous, puis changez-le",
                detail:
                  "Une fois connecté, l'icône en forme de clé, en haut à droite, vous permet de choisir le mot de passe qui vous convient.",
              },
            ].map((etape, i) => (
              <li key={etape.titre} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {etape.titre}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{etape.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Link
          href="/login"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-[15px] font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <span className="rotate-180">
            <Icone nom="fleche" size={16} />
          </span>
          Revenir à la connexion
        </Link>
      </div>
    </main>
  );
}
