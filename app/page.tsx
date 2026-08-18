import { supabase } from "@/lib/supabaseClient";

export default async function Home() {
  const { data: pieces, error } = await supabase
    .from("pieces")
    .select("id, nom, categorie, reference, types_vehicules(nom)")
    .order("nom");

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Stock — Pièces</h1>

      {error && <p style={{ color: "red" }}>Erreur : {error.message}</p>}

      {pieces && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                }}
              >
                Pièce
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                }}
              >
                Véhicule
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #ccc",
                  padding: "8px",
                }}
              >
                Catégorie
              </th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((piece) => (
              <tr key={piece.id}>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  {piece.nom}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  {piece.types_vehicules?.nom || "—"}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                  {piece.categorie}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
