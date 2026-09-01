"use client";

import { useEffect, useState } from "react";
import { useOffline } from "next/offline";
import { Icone } from "@/app/components/icones";

/* Enregistrement du service worker + bandeau hors ligne + invite d'installation.
   Monté une fois dans le layout racine. */
export default function PWA() {
  useServiceWorker();
  return (
    <>
      <OfflineBanner />
      <InstallInvite />
    </>
  );
}

function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let recharge = false;
    const onControllerChange = () => {
      if (recharge) return;
      recharge = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        // Mise à jour agressive : dès qu'une nouvelle version est prête, on l'active.
        const promouvoir = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        };
        promouvoir(registration.waiting);
        registration.addEventListener("updatefound", () => promouvoir(registration.installing));
        // Vérifie une mise à jour à chaque retour sur l'onglet.
        const onVisible = () => {
          if (document.visibilityState === "visible") registration.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
}

function OfflineBanner() {
  const horsLigne = useOffline();
  if (!horsLigne) return null;
  return (
    <div
      role="status"
      className="sticky top-[57px] z-30 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white"
    >
      <Icone nom="alerte" size={14} />
      Hors ligne — vous consultez la dernière version chargée. Vos envois partiront au retour du réseau.
    </div>
  );
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const CLE_REFUS = "gpr-install-refuse";

function InstallInvite() {
  const [evenement, setEvenement] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLE_REFUS)) return;
    } catch {
      /* localStorage indisponible : on tentera quand même l'invite */
    }
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvenement(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function refuser() {
    setVisible(false);
    try {
      localStorage.setItem(CLE_REFUS, "1");
    } catch {
      /* rien à faire */
    }
  }

  async function installer() {
    if (!evenement) return;
    await evenement.prompt();
    await evenement.userChoice.catch(() => undefined);
    setVisible(false);
    setEvenement(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[76px] z-30 mx-auto max-w-md rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-lg shadow-neutral-950/10 sm:bottom-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-white">
          <Icone nom="accueil" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">Installer GPR</p>
          <p className="text-xs text-neutral-500">Accès direct et fonctionnement hors ligne.</p>
        </div>
        <button
          onClick={refuser}
          className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Plus tard
        </button>
        <button
          onClick={installer}
          className="rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-700"
        >
          Installer
        </button>
      </div>
    </div>
  );
}
