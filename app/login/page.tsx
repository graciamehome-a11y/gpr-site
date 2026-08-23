"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { connexion } from "./actions";

export default function Login() {
  return (
    <Suspense fallback={null}>
      <FormulaireConnexion />
    </Suspense>
  );
}

function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(connexion, undefined);
  const params = useSearchParams();
  const suivant = params.get("suivant") ?? "/";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
            GPR
          </h1>
          <p className="text-sm text-neutral-500">
            Gestion des Pièces &amp; Réparations
          </p>
        </div>

        <form action={action} className="space-y-3">
          <input type="hidden" name="suivant" value={suivant} />
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Email"
              required
              autoFocus
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Mot de passe"
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
            />
          </div>

          {etat?.erreur && (
            <p className="text-sm text-red-600" role="alert">
              {etat.erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={enCours}
            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-[15px] font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {enCours ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Accès réservé aux comptes créés par l&apos;administration.
        </p>
      </div>
    </main>
  );
}
