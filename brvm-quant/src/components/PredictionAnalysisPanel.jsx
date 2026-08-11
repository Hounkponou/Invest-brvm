/**
 * PredictionAnalysisPanel — analyse prédictive DÉTAILLÉE d'un titre, dans la
 * modale de détail (réintègre ce que la table de signaux ne montre plus).
 * Par horizon (Court/Moyen/Long) : directive, prévision, cours cible, duel
 * Score Modèle vs Score IA, justification, saisonnalité, avis Gemini.
 * Style aplati (lignes/sections, pas de cartes flottantes).
 */
import React from "react";
import { ScoreBar } from "./DataTable";
import {
  getScore10, getGeminiScore10, getFinalDirective, getForecast, getTargetPrice,
  getDuelVerdict, buildScoreJustification, getSeasonMeta, formatFcfa, horizonTarget, HORIZONS,
} from "../utils/predictionHelpers";

const HLABEL = Object.fromEntries(HORIZONS.map((h) => [h.days, h.label]));

function Line({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "7px 0", borderBottom: "1px solid var(--border-color)" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "var(--text-main)", textAlign: "right" }}>{children}</span>
    </div>
  );
}

function HorizonBlock({ pred, market, gemini, season }) {
  const score = getScore10(pred);
  const iaScore = getGeminiScore10(gemini);
  const directive = getFinalDirective(pred, gemini);
  const tr = horizonTarget(pred.horizon_jours);
  const forecast = getForecast(pred, directive, pred.horizon_jours, tr);
  const target = getTargetPrice(pred, market, directive, pred.horizon_jours, tr);
  const duel = getDuelVerdict(score, gemini);
  const drivers = buildScoreJustification(pred, market, season);
  const seasonMeta = getSeasonMeta(season);

  return (
    <div style={{ marginTop: 16 }}>
      {/* En-tête : horizon + directive */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: "0.78em", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
          {HLABEL[pred.horizon_jours] || `${pred.horizon_jours} j`}
        </span>
        <span style={{ fontSize: "1.25em", fontWeight: 900, letterSpacing: "0.02em", color: directive.color }}>{directive.label}</span>
      </div>

      <Line label="Prévision">
        <span style={{ color: forecast.color }}>{forecast.arrow} tendance {forecast.trend}</span>
        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> · objectif {forecast.objective} · proba {forecast.probaPct}%</span>
      </Line>
      {target && (
        <Line label="Cours cible">
          <span style={{ color: directive.color }}>{formatFcfa(target.central)}</span>
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> ({formatFcfa(target.low)} – {formatFcfa(target.high)})</span>
        </Line>
      )}
      <Line label="Score Modèle"><ScoreBar score={score} /></Line>
      <Line label="Score IA (Gemini)">{iaScore == null ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>indisponible</span> : `${iaScore}/10`}</Line>
      <Line label="Verdict"><span style={{ color: duel.color }}>{duel.label}</span></Line>
      {season && <Line label="Saisonnalité"><span style={{ color: seasonMeta.color }}>{seasonMeta.arrow} {season.season_dir}</span></Line>}

      {drivers.length > 0 && (
        <div style={{ marginTop: 8, fontSize: "0.82em", color: "var(--text-muted)" }}>
          <span style={{ textTransform: "uppercase", fontSize: "0.85em", fontWeight: 700, marginRight: 6 }}>Pourquoi</span>
          {drivers.map((d, i) => (
            <span key={i} style={{ color: d.sign === "+" ? "var(--up-color)" : "var(--down-color)", marginRight: 10 }}>
              <strong>{d.sign}</strong> {d.text}
            </span>
          ))}
        </div>
      )}
      {season?.season_label && (
        <div style={{ marginTop: 4, fontSize: "0.8em", color: "var(--text-muted)" }}>{season.season_label}</div>
      )}
    </div>
  );
}

export default function PredictionAnalysisPanel({ symbol, predictions = [], market, gemini, season }) {
  const rows = (predictions || [])
    .filter((p) => p.symbole === symbol)
    .sort((a, b) => Number(a.horizon_jours) - Number(b.horizon_jours));
  if (rows.length === 0) return null;

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 10, padding: 20, marginTop: 20 }}>
      <h3 style={{ margin: 0, color: "var(--text-main)" }}>Signaux prédictifs</h3>
      <div style={{ color: "var(--text-muted)", fontSize: "0.82em", marginTop: 2 }}>
        Par horizon — modèle XGBoost calibré + saisonnalité, croisé avec l'avis IA. N'est pas un conseil.
      </div>
      {rows.map((p) => (
        <HorizonBlock key={p.horizon_jours} pred={p} market={market} gemini={gemini} season={season} />
      ))}
    </div>
  );
}
