/**
 * BacktestPanel — le « Challenge » : performance historique du modèle.
 * --------------------------------------------------------------------
 * Affiche, à partir des prédictions ARRIVÉES À TERME (statut_reussite connu) :
 *   - 3 KPI de tête : taux de réussite, nombre de paris jugés, écart moyen ;
 *   - une courbe Recharts du taux de réussite CUMULÉ dans le temps ;
 *   - un histogramme mensuel succès / échec.
 *
 * Toutes les couleurs des graphes pointent vers les tokens --ipx-* : les
 * graphiques se re-colorent donc automatiquement au basculement Dark/Solar.
 */
import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import StatCard from "./StatCard";
import { formatPct, getPnlColor } from "../../utils/predictionHelpers";

/** Style commun des tooltips Recharts, aligné sur le thème. */
const tooltipStyle = {
  backgroundColor: "var(--ipx-surface)",
  border: "1px solid var(--ipx-border)",
  borderRadius: 12,
  color: "var(--ipx-fg)",
};

export default function BacktestPanel({ backtest }) {
  const { total, hitRate, avgReturn, series, monthly } = backtest;

  // Cas « pas encore de résultats » : message pédagogique, pas d'écran vide
  if (!total) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
        <p className="text-sm">
          Aucune prédiction n'est encore arrivée à terme. Le Challenge s'affichera
          dès que les premiers signaux auront atteint leur horizon de 15 jours.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* --- KPI de tête (grille mobile-first) --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Taux de réussite"
          value={`${hitRate} %`}
          accent={hitRate >= 55 ? "var(--ipx-up)" : hitRate >= 45 ? "var(--ipx-warn)" : "var(--ipx-down)"}
          hint="Objectif atteint à l'horizon"
        />
        <StatCard label="Signaux jugés" value={total} accent="var(--ipx-accent)" hint="Prédictions clôturées" />
        <StatCard
          label="Écart moyen"
          value={formatPct(avgReturn)}
          accent={getPnlColor(avgReturn)}
          hint="Performance moyenne à terme"
        />
      </div>

      {/* --- Courbe du taux de réussite cumulé --- */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h4 className="mb-3 text-sm font-bold text-fg">Fiabilité cumulée du modèle</h4>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="ipxHit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--ipx-accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--ipx-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ipx-border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--ipx-muted)" tick={{ fontSize: 11 }} minTickGap={40} />
              <YAxis stroke="var(--ipx-muted)" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={40} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} %`, "Réussite cumulée"]} />
              {/* Ligne de référence 50 % = hasard */}
              <ReferenceLine y={50} stroke="var(--ipx-muted)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="hitRate"
                stroke="var(--ipx-accent)"
                strokeWidth={3}
                fill="url(#ipxHit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Histogramme mensuel succès / échec --- */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h4 className="mb-3 text-sm font-bold text-fg">Résultats par mois</h4>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ipx-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--ipx-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--ipx-muted)" tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="success" name="Réussis" stackId="a" fill="var(--ipx-up)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fail" name="Échoués" stackId="a" fill="var(--ipx-down)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
