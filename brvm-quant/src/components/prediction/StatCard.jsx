/**
 * StatCard — petite carte KPI réutilisable (valeur + libellé + accent).
 * ---------------------------------------------------------------------
 * Sert d'en-tête synthétique au panneau de backtest et à la vue prédictive.
 * Bordure gauche colorée pour hiérarchiser visuellement l'information.
 */
import React from "react";

export default function StatCard({ label, value, accent = "var(--ipx-accent)", hint }) {
  return (
    <div
      className="rounded-2xl border border-border bg-surface p-4"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-black" style={{ color: accent }}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
