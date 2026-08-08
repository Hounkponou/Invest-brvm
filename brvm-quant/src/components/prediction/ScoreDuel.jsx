/**
 * ScoreDuel — le « Challenge » de scores : Modèle (quant) vs IA (Gemini).
 * ----------------------------------------------------------------------
 * Affiche côte à côte :
 *   - GAUCHE : Score Modèle /10 (XGBoost calibré + tilt saisonnalité) — calcul
 *              mathématique ;
 *   - DROITE : Score IA /10 dérivé de la recommandation Gemini — avis qualitatif.
 * Puis un verdict d'ACCORD / DIVERGENCE. Dégradation propre si l'IA est absente
 * (clé Gemini invalide) : la colonne IA affiche « indisponible ».
 */
import React from "react";
import { getScoreColor, getGeminiScore10, getDuelVerdict } from "../../utils/predictionHelpers";

function ScoreCol({ label, sub, score }) {
  const has = score != null;
  const color = has ? getScoreColor(score) : "var(--ipx-muted)";
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 px-2 py-1">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="text-2xl font-black leading-none" style={{ color }}>
        {has ? score : "—"}
        <span className="text-sm font-semibold text-muted">/10</span>
      </div>
      <div className="text-[10px] text-muted">{sub}</div>
    </div>
  );
}

export default function ScoreDuel({ modelScore, gemini }) {
  const iaScore = getGeminiScore10(gemini);
  const verdict = getDuelVerdict(modelScore, gemini);

  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-stretch">
        <ScoreCol label="Score Modèle" sub="calcul quantitatif" score={modelScore} />
        <div className="mx-1 w-px self-stretch bg-border" />
        <ScoreCol label="Score IA" sub="avis Gemini" score={iaScore} />
      </div>
      <div
        className="mt-2 rounded-lg px-2 py-1 text-center text-[11px] font-semibold"
        style={{ color: verdict.color, backgroundColor: "var(--ipx-surface-2)" }}
      >
        {verdict.label}
      </div>
    </div>
  );
}
