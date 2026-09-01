"use client";

import { useEffect, useState } from "react";
import { useOffline } from "next/offline";

/** Bouton « Réessayer » + retour automatique dès que le réseau revient. */
export default function RetourEnLigne() {
  const horsLigne = useOffline();
  const [tente, setTente] = useState(false);

  useEffect(() => {
    if (!horsLigne && tente) window.location.replace("/");
  }, [horsLigne, tente]);

  return (
    <button
      onClick={() => {
        setTente(true);
        window.location.reload();
      }}
      className="mt-5 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 active:scale-[0.98]"
    >
      Réessayer
    </button>
  );
}
