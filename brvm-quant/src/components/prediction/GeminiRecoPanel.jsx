/**
 * GeminiRecoPanel — recommandation CLAIRE de Gemini pour une action.
 * ------------------------------------------------------------------
 * Format : « Au vu du marché, des informations web et de l'analyse,
 * Gemini recommande <recommandation> — <justification>. » + sources web.
 *
 * Couleurs via tokens --ipx-* -> compatibles Dark/Solar.
 * Rendu null si aucune reco Gemini pour ce titre (dégradation propre).
 */
import React from "react";

// Recommandation -> couleur + fond translucide
const RECO_META = {
  "Achat fort": { color: "var(--ipx-up)", bg: "var(--ipx-up-soft)" },
  "Achat modéré": { color: "var(--ipx-warn)", bg: "var(--ipx-warn-soft)" },
  "Conservation": { color: "var(--ipx-muted)", bg: "var(--ipx-surface-2)" },
  "Vente": { color: "var(--ipx-down)", bg: "var(--ipx-down-soft)" },
};

export default function GeminiRecoPanel({ gemini }) {
  if (!gemini) return null;

  const reco = gemini.recommandation || "Conservation";
  const meta = RECO_META[reco] || RECO_META["Conservation"];
  const sources = Array.isArray(gemini.sources) ? gemini.sources : [];

  return (
    <div className="mt-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      {/* En-tête : marque Gemini + pastille de recommandation */}
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-bold text-fg">✦ Avis Gemini</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-bold"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {reco}
        </span>
        {gemini.sentiment_web && (
          <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] text-muted">
            Web : {gemini.sentiment_web}
          </span>
        )}
      </div>

      {/* Phrase de recommandation + justification */}
      <p className="text-muted">
        Au vu du marché, des informations web et de l'analyse, Gemini recommande{" "}
        <span style={{ color: meta.color, fontWeight: 700 }}>{reco.toLowerCase()}</span>
        {gemini.justification ? <> — {gemini.justification}</> : "."}
      </p>

      {sources.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted">Sources :</span>
          {sources.slice(0, 3).map((u, i) => (
            <a
              key={i}
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] underline"
              style={{ color: "var(--ipx-accent)" }}
            >
              lien {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
