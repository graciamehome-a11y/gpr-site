"use client";

import { useEffect } from "react";

/**
 * Dernier filet de sécurité : erreur survenue dans le layout racine lui-même,
 * quand `app/error.tsx` ne peut pas prendre le relais. Ce composant remplace
 * tout le document, il doit donc fournir lui-même <html> et <body>.
 *
 * Volontairement dépouillé : sans les styles de l'application, mieux vaut une
 * page sobre qui explique le problème qu'une page cassée.
 */
export default function ErreurGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur critique :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100dvh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
          background: "#fafafa",
          color: "#171717",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.05rem", fontWeight: 600 }}>
            L&apos;application n&apos;a pas pu démarrer
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#525252" }}>
            Un problème technique empêche l&apos;affichage. Vos données ne sont pas en cause —
            elles sont intactes sur le serveur.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "white",
              background: "#4f46e5",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
          <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#737373" }}>
            Si le problème persiste, rechargez la page dans quelques minutes
            {error.digest ? ` et signalez le code « ${error.digest} »` : ""}.
          </p>
        </div>
      </body>
    </html>
  );
}
