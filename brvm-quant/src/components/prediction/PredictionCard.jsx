/**
 * PredictionCard — carte d'un signal, refondue pour la LISIBILITÉ.
 * ---------------------------------------------------------------
 * De haut en bas :
 *   1. Identité (symbole, secteur, badge de saisonnalité) + jauge Score Modèle ;
 *   2. DIRECTIVE ultra-claire (ACHAT / CONSERVER / VENTE) + prévision explicite
 *      (tendance haussière/baissière, objectif %, probabilité, horizon) ;
 *   3. barre de probabilité ;
 *   4. DUEL Score Modèle vs Score IA (Gemini) ;
 *   5. justification lisible du score (moteurs +/−, dont la saisonnalité).
 *
 * Tous les nouveaux facteurs proviennent de props déjà disponibles côté page :
 *   - `market` : ligne marketData du titre (per, rsi_14, valo, rendement…) ;
 *   - `gemini` : reco Gemini du titre (peut être absente -> duel dégradé) ;
 *   - `season` : saisonnalité du titre (peut être absente).
 */
import React from "react";
import ScoreGauge from "./ScoreGauge";
import ProbabilityBar from "./ProbabilityBar";
import SeasonalityBadge from "./SeasonalityBadge";
import ScoreDuel from "./ScoreDuel";
import {
  getScore10,
  getFinalDirective,
  getForecast,
  buildScoreJustification,
  formatFcfa,
} from "../../utils/predictionHelpers";

export default function PredictionCard({ pred, sector, market, gemini, season, onClick }) {
  const score = getScore10(pred);
  const directive = getFinalDirective(pred, gemini);
  const forecast = getForecast(pred, pred?.horizon_jours || 15);
  const drivers = buildScoreJustification(pred, market, season);

  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(pred) : undefined}
      className="group flex w-full flex-col gap-4 rounded-2xl border border-border bg-surface
                 p-5 text-left transition hover:border-accent hover:shadow-lg
                 focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {/* 1. Identité + jauge Score Modèle */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-black text-fg">{pred.symbole}</span>
            {sector && (
              <span className="rounded-full bg-surface2 px-2 py-0.5 text-[11px] text-muted">{sector}</span>
            )}
          </div>
          <div className="mt-1 text-sm text-muted">
            Prix d'entrée : <span className="font-semibold text-fg">{formatFcfa(pred.prix_initial)}</span>
          </div>
          {season && (
            <div className="mt-2">
              <SeasonalityBadge season={season} size="sm" />
            </div>
          )}
        </div>
        <div className="shrink-0">
          <ScoreGauge score={score} size={104} label="Score Modèle" />
        </div>
      </div>

      {/* 2. Directive ultra-claire + prévision explicite */}
      <div className="rounded-xl px-4 py-3" style={{ backgroundColor: directive.bg }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-2xl font-black tracking-tight" style={{ color: directive.color }}>
            {directive.label}
          </span>
          <span className="text-sm font-semibold" style={{ color: forecast.color }}>
            {forecast.arrow} Tendance {forecast.trend}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted">
          Objectif <span className="font-semibold text-fg">{forecast.objective}</span> à{" "}
          {forecast.horizonDays} j · probabilité{" "}
          <span className="font-semibold text-fg">{forecast.probaPct} %</span>
          {directive.diverge && (
            <span className="ml-1" style={{ color: "var(--ipx-warn)" }}>· avis IA divergent</span>
          )}
        </div>
      </div>

      {/* 3. Barre de probabilité */}
      <ProbabilityBar probability={pred.probabilite_modele} />

      {/* 4. Duel Modèle vs IA */}
      <ScoreDuel modelScore={score} gemini={gemini} />

      {/* 5. Justification du score */}
      {drivers.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Pourquoi ce score
          </div>
          <div className="flex flex-wrap gap-1.5">
            {drivers.map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
                style={{
                  color: d.sign === "+" ? "var(--ipx-up)" : "var(--ipx-down)",
                  backgroundColor: "var(--ipx-surface-2)",
                }}
              >
                <span className="font-bold">{d.sign}</span>
                {d.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
