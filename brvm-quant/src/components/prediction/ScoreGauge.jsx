/**
 * ScoreGauge — jauge radiale (demi-cercle) affichant un score sur 10.
 * -------------------------------------------------------------------
 * Vulgarisation visuelle : plutôt qu'un chiffre brut, on montre une aiguille
 * remplie de rouge -> ambre -> vert. SVG pur (aucune dépendance), fluide et
 * responsive (viewBox). La couleur suit automatiquement le thème via les
 * variables CSS --ipx-*.
 *
 * Props :
 *   - score : nombre 0..10
 *   - size  : diamètre en px (défaut 140)
 *   - label : libellé sous le score (défaut "Score IA")
 */
import React from "react";
import { getScoreColor } from "../../utils/predictionHelpers";

export default function ScoreGauge({ score = 0, size = 140, label = "Score IA" }) {
  const clamped = Math.max(0, Math.min(10, Number(score) || 0));
  const color = getScoreColor(clamped);

  // Géométrie du demi-cercle
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Longueur du demi-cercle (π·r) ; on remplit une fraction = score/10
  const semi = Math.PI * r;
  const filled = (clamped / 10) * semi;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg
        width={size}
        height={size / 2 + stroke}
        viewBox={`0 0 ${size} ${size / 2 + stroke}`}
        role="img"
        aria-label={`${label} : ${clamped} sur 10`}
      >
        {/* Piste de fond */}
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="var(--ipx-surface-2)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Arc rempli proportionnel au score */}
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${semi}`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>

      {/* Valeur + libellé */}
      <div className="-mt-6 flex flex-col items-center">
        <div className="text-3xl font-black leading-none" style={{ color }}>
          {clamped}
          <span className="text-base font-semibold text-muted">/10</span>
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </div>
      </div>
    </div>
  );
}
