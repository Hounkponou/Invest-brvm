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
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import StatCard from "./StatCard";
import { formatPct, getPnlColor, getScoreColor, getClosedStatusMeta } from "../../utils/predictionHelpers";

/** Style commun des tooltips Recharts, aligné sur le thème. */
const tooltipStyle = {
  backgroundColor: "var(--ipx-surface)",
  border: "1px solid var(--ipx-border)",
  borderRadius: 12,
  color: "var(--ipx-fg)",
};

export default function BacktestPanel({ backtest }) {
  const { total, hitRate, directionalRate, partial, avgReturn, series, monthly, recent = [] } = backtest;

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
      {/* --- KPI de tête (grille mobile-first) : 3 modalités mises en avant --- */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Taux de réussite"
          value={`${hitRate} %`}
          accent={hitRate >= 55 ? "var(--ipx-up)" : hitRate >= 45 ? "var(--ipx-warn)" : "var(--ipx-down)"}
          hint="Objectif atteint à l'horizon"
        />
        <StatCard
          label="Bon sens"
          value={`${directionalRate} %`}
          accent={directionalRate >= 60 ? "var(--ipx-up)" : "var(--ipx-warn)"}
          hint={`Réussis + partiels (${partial} partiels)`}
        />
        <StatCard label="Signaux jugés" value={total} accent="var(--ipx-accent)" hint="Prédictions clôturées" />
        <StatCard
          label="Écart moyen"
          value={formatPct(avgReturn)}
          accent={getPnlColor(avgReturn)}
          hint="Performance moyenne à terme"
        />
      </div>

      {/* --- Transparence : ce que le modèle avait PRÉDIT vs le RÉEL --- */}
      {recent.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h4 className="mb-1 text-sm font-bold text-fg">Modèle vs réel</h4>
          <p className="mb-3 text-xs text-muted">
            Ce que le modèle avait annoncé, confronté au résultat réel à l'horizon.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm tabular-nums">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Titre</th>
                  <th className="py-2 pr-3 font-semibold">Échéance</th>
                  <th className="py-2 pr-3 font-semibold">Prédit</th>
                  <th className="py-2 pr-3 text-right font-semibold">Réel</th>
                  <th className="py-2 text-right font-semibold">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={`${r.symbole}-${r.date}-${i}`} className="border-b border-border/60 last:border-none">
                    <td className="py-2 pr-3 font-bold text-fg">{r.symbole}</td>
                    <td className="py-2 pr-3 text-muted">{String(r.date).slice(0, 10)}</td>
                    <td className="py-2 pr-3">
                      {r.score != null && (
                        <span className="font-semibold" style={{ color: getScoreColor(r.score) }}>{r.score}/10</span>
                      )}
                      {r.proba != null && (
                        <span className="text-muted"> · {Math.round(r.proba * 100)} %</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold" style={{ color: getPnlColor(r.real) }}>
                      {formatPct(r.real)}
                    </td>
                    <td className="py-2 text-right">
                      {(() => {
                        const m = getClosedStatusMeta(r.status);
                        return (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                            style={{ color: m.color, backgroundColor: m.bg }}
                          >
                            {m.label}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Courbe cumulée : réussite stricte + bon sens (réussi + partiel) --- */}
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
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} %`, n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* Ligne de référence 50 % = hasard */}
              <ReferenceLine y={50} stroke="var(--ipx-muted)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="hitRate"
                name="Réussite"
                stroke="var(--ipx-accent)"
                strokeWidth={3}
                fill="url(#ipxHit)"
              />
              <Line
                type="monotone"
                dataKey="dirRate"
                name="Bon sens"
                stroke="var(--ipx-warn)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Histogramme mensuel à 3 modalités (réussi / partiel / manqué) --- */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <h4 className="mb-3 text-sm font-bold text-fg">Résultats par mois</h4>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ipx-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--ipx-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--ipx-muted)" tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="reussi" name="Réussis" stackId="a" fill="var(--ipx-up)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="partiel" name="Partiels" stackId="a" fill="var(--ipx-warn)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="manque" name="Manqués" stackId="a" fill="var(--ipx-down)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
