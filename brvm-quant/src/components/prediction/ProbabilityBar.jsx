/**
 * ProbabilityBar — barre horizontale montrant la probabilité de hausse.
 * ---------------------------------------------------------------------
 * Rend une probabilité [0..1] sous forme de barre remplie + pourcentage.
 * Des repères aux seuils 55 % (Modéré) et 70 % (Fort) aident l'utilisateur
 * à situer visuellement le signal.
 */
import React from "react";

export default function ProbabilityBar({ probability = 0, height = 8 }) {
  const pct = Math.max(0, Math.min(100, Number(probability) * 100));
  const color =
    pct >= 70 ? "var(--ipx-up)" : pct >= 55 ? "var(--ipx-warn)" : "var(--ipx-muted)";

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <span>Probabilité de hausse (15 j)</span>
        <span className="font-bold" style={{ color }}>{pct.toFixed(0)} %</span>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-full"
        style={{ height, backgroundColor: "var(--ipx-surface-2)" }}
      >
        {/* Remplissage */}
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color, transition: "width 0.6s ease" }}
        />
        {/* Repères de seuils */}
        {[55, 70].map((t) => (
          <div
            key={t}
            className="absolute top-0 h-full"
            style={{ left: `${t}%`, width: 2, backgroundColor: "var(--ipx-bg)", opacity: 0.7 }}
          />
        ))}
      </div>
    </div>
  );
}
