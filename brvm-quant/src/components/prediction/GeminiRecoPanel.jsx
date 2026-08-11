/**
 * GeminiRecoPanel — recommandation TEXTE de Gemini pour une action (une seule fois
 * par titre, dans la modale de détail). Style plat (cohérent avec le reste).
 * Rendu null si aucune reco Gemini (dégradation propre).
 */
import React from "react";

const RECO_META = {
  "Achat fort": "var(--up-color)",
  "Achat modéré": "var(--warn-color)",
  "Conservation": "var(--text-muted)",
  "Vente": "var(--down-color)",
};

export default function GeminiRecoPanel({ gemini }) {
  if (!gemini) return null;
  const reco = gemini.recommandation || "Conservation";
  const color = RECO_META[reco] || "var(--text-muted)";
  const sources = Array.isArray(gemini.sources) ? gemini.sources : [];

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 10, padding: 20, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <h3 style={{ margin: 0, color: "var(--text-main)" }}>Recommandation IA (Gemini)</h3>
        <span style={{ fontWeight: 800, color, fontSize: "1.05em" }}>{reco}</span>
        {gemini.sentiment_web && (
          <span style={{ fontSize: "0.75em", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: 20, padding: "2px 8px" }}>
            Web : {gemini.sentiment_web}
          </span>
        )}
      </div>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.92em", lineHeight: 1.5 }}>
        Au vu du marché, des informations web et de l'analyse, Gemini recommande{" "}
        <span style={{ color, fontWeight: 700 }}>{reco.toLowerCase()}</span>
        {gemini.justification ? ` — ${gemini.justification}` : "."}
      </p>
      {sources.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>Sources :</span>
          {sources.slice(0, 3).map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.8em", color: "var(--accent-blue)", textDecoration: "underline" }}>lien {i + 1}</a>
          ))}
        </div>
      )}
      <div style={{ marginTop: 6, fontSize: "0.72em", color: "var(--text-muted)" }}>N'est pas un conseil en investissement.</div>
    </div>
  );
}
