/**
 * PredictionCard — carte d'un signal de prédiction pour un titre.
 * ---------------------------------------------------------------
 * Assemble les briques de vulgarisation : jauge de score, badge de signal,
 * barre de probabilité et prix. Conçue mobile-first (empilement vertical),
 * elle passe en ligne sur les écrans plus larges.
 *
 * Props :
 *   - pred    : ligne de log_predictions
 *   - sector  : secteur (facultatif, via brvmConfig)
 *   - onClick : callback optionnel (ex: ouvrir le détail)
 */
import React from "react";
import ScoreGauge from "./ScoreGauge";
import SignalBadge from "./SignalBadge";
import ProbabilityBar from "./ProbabilityBar";
import { getScore10, getSignal, formatFcfa } from "../../utils/predictionHelpers";

export default function PredictionCard({ pred, sector, onClick }) {
  const score = getScore10(pred);
  const signal = getSignal(pred);

  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(pred) : undefined}
      className="group flex w-full flex-col gap-4 rounded-2xl border border-border
                 bg-surface p-5 text-left transition hover:border-accent
                 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent
                 sm:flex-row sm:items-center"
    >
      {/* Bloc identité */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-fg">{pred.symbole}</span>
          {sector && (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] text-muted">
              {sector}
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-muted">
          Prix d'entrée : <span className="font-semibold text-fg">{formatFcfa(pred.prix_initial)}</span>
        </div>

        <div className="mt-3">
          <SignalBadge signal={signal} />
        </div>

        <div className="mt-4">
          <ProbabilityBar probability={pred.probabilite_modele} />
        </div>
      </div>

      {/* Jauge de score */}
      <div className="flex shrink-0 justify-center sm:justify-end">
        <ScoreGauge score={score} size={128} />
      </div>
    </button>
  );
}
