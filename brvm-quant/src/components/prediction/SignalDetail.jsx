/**
 * SignalDetail — vue dédiée d'un signal (page Signaux), à la place de la modale
 * d'analyse du Screener : un GRAPHIQUE DE PROJECTION (cours -> cours cible avec
 * bandes de volatilité) + les ÉLÉMENTS DE RISQUE (RiskPanel). Le Screener garde
 * sa propre modale inchangée.
 */
import React from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import RiskPanel from "../RiskPanel";
import { getFinalDirective, getForecast, getTargetPrice, projectSignalPath, formatFcfa, HORIZONS } from "../../utils/predictionHelpers";
import { getSector } from "../../utils/brvmConfig";

const HLABEL = Object.fromEntries(HORIZONS.map((h) => [h.days, h.label]));
const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR")} F`;

export default function SignalDetail({ signal, market, risk, gemini, season, onClose }) {
  if (!signal) return null;
  const sym = signal.symbole;
  const dir = getFinalDirective(signal, gemini);
  const forecast = getForecast(signal, dir, signal.horizon_jours);
  const target = getTargetPrice(signal, market, dir, signal.horizon_jours);
  const start = Math.round(Number(market?.close ?? signal.prix_initial) || 0);
  const vol = risk?.volatility?.adj ?? 20;
  const path = projectSignalPath(start, target?.central ?? start, signal.horizon_jours, vol);
  const data = path.map((p) => ({ day: p.day, low: p.low, band: p.high - p.low, median: p.median }));

  return (
    <div className="stock-detail" style={{ position: "fixed", inset: 0, background: "var(--bg-base)", zIndex: 100, display: "flex", flexDirection: "column", padding: "30px 40px", overflowY: "auto" }}>
      {/* En-tête */}
      <div className="stock-detail-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "2em", color: "var(--text-main)" }}>{market?.nom || sym}</h2>
          <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
            {sym} · {getSector(sym)} · <strong style={{ color: "var(--text-main)" }}>{HLABEL[signal.horizon_jours] || `${signal.horizon_jours} j`}</strong>
            {" · "}<span style={{ color: dir.color, fontWeight: 800 }}>{dir.label}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-panel)", color: "var(--text-main)", fontWeight: 600, cursor: "pointer" }}>Fermer</button>
      </div>

      {/* Projection */}
      <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 10, padding: 20 }}>
        <h3 style={{ margin: "0 0 4px", color: "var(--text-main)" }}>Projection à {signal.horizon_jours} jours</h3>
        <div style={{ color: "var(--text-muted)", fontSize: "0.82em", marginBottom: 12 }}>
          Du cours actuel <strong style={{ color: "var(--text-main)" }}>{fcfa(start)}</strong> vers le cours cible
          {" "}<strong style={{ color: dir.color }}>{target ? fcfa(target.central) : "—"}</strong>
          {" "}(objectif {forecast.objective} · proba {forecast.probaPct} %). Bandes = incertitude issue de la volatilité (~{Number(vol).toFixed(0)} %).
          <strong style={{ color: "var(--text-main)" }}> Ce n'est pas une garantie.</strong>
        </div>
        <div style={{ height: 260, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 12 }} tickFormatter={(d) => (d === 0 ? "Auj." : `J+${d}`)} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={70} domain={["auto", "auto"]} tickFormatter={(v) => `${(v / 1000).toLocaleString("fr-FR")} k`} />
              <Tooltip contentStyle={{ backgroundColor: "var(--bg-base)", borderColor: "var(--border-color)" }}
                labelFormatter={(d) => (d === 0 ? "Aujourd'hui" : `J+${d}`)}
                formatter={(val, name) => (name === "band" ? null : [fcfa(val), name === "median" ? "Médian" : "Bas"])} />
              <ReferenceLine y={start} stroke="var(--text-muted)" strokeDasharray="4 4" />
              <Area dataKey="low" stackId="a" stroke="none" fill="transparent" />
              <Area dataKey="band" stackId="a" stroke="none" fill={dir.color} fillOpacity={0.14} name="band" />
              <Line dataKey="median" stroke={dir.color} strokeWidth={2.5} dot={false} name="median" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {target && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 12, fontVariantNumeric: "tabular-nums" }}>
            <div><div style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>Cours actuel</div><div style={{ fontSize: "1.2em", fontWeight: 700, color: "var(--text-main)" }}>{fcfa(start)}</div></div>
            <div><div style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>Cours cible</div><div style={{ fontSize: "1.2em", fontWeight: 700, color: dir.color }}>{fcfa(target.central)}</div></div>
            <div><div style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>Fourchette</div><div style={{ fontSize: "1.2em", fontWeight: 700, color: "var(--text-main)" }}>{fcfa(target.low)} – {fcfa(target.high)}</div></div>
          </div>
        )}
      </div>

      {/* Éléments de risque */}
      <RiskPanel risk={risk} />
    </div>
  );
}
