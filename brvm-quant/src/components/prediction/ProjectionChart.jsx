/**
 * ProjectionChart — trajectoires PRÉDITES du cours, à afficher JUSTE APRÈS le
 * graphique du cours (continuité histoire -> futur). Depuis le cours actuel, une
 * ligne par horizon (Court 5 j / Moyen 20 j / Long 60 j) vers son cours cible,
 * avec une bande d'incertitude (volatilité) sur l'horizon le plus long.
 */
import React from "react";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { getFinalDirective, getTargetPrice, horizonTarget } from "../../utils/predictionHelpers";

const HZ = { 5: { label: "Court (5 j)", color: "var(--warn-color)" }, 20: { label: "Moyen (20 j)", color: "var(--accent-blue)" }, 60: { label: "Long (60 j)", color: "#8b5cf6" } };
const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR")} F`;

export default function ProjectionChart({ symbol, predictions = [], market, risk, gemini }) {
  const signals = (predictions || []).filter((p) => p.symbole === symbol).sort((a, b) => a.horizon_jours - b.horizon_jours);
  if (signals.length === 0) return null;

  const start = Math.round(Number(market?.close ?? signals[0].prix_initial) || 0);
  if (!start) return null;
  const vol = risk?.volatility?.adj ?? 20;
  const sigDaily = Math.max(0, vol / 100) / Math.sqrt(252);

  const seg = signals.map((s) => {
    const dir = getFinalDirective(s, gemini);
    const tgt = getTargetPrice(s, market, dir, s.horizon_jours, horizonTarget(s.horizon_jours))?.central ?? start;
    return { h: Number(s.horizon_jours), drift: Math.log((tgt > 0 ? tgt : start) / start) / Math.max(1, s.horizon_jours), dir, tgt };
  });
  const longest = seg.reduce((a, b) => (b.h > a.h ? b : a));
  const maxH = longest.h;
  const N = Math.min(maxH, 40);

  const data = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * maxH;
    const row = { day: Math.round(t) };
    seg.forEach((g) => { if (t <= g.h + 1e-9) row[`h${g.h}`] = Math.round(start * Math.exp(g.drift * t)); });
    const spread = sigDaily * Math.sqrt(t);
    const lo = Math.round(start * Math.exp(longest.drift * t - spread));
    const hi = Math.round(start * Math.exp(longest.drift * t + spread));
    row.bandLow = lo; row.band = Math.max(0, hi - lo);
    data.push(row);
  }

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 20, marginTop: 16 }}>
      <h3 style={{ margin: "0 0 4px", color: "var(--text-main)" }}>Trajectoires prédites</h3>
      <div style={{ color: "var(--text-muted)", fontSize: "0.82em", marginBottom: 12 }}>
        Du cours actuel <strong style={{ color: "var(--text-main)" }}>{fcfa(start)}</strong> vers le cours cible de chaque horizon,
        avec bande d'incertitude (volatilité ~{Number(vol).toFixed(0)} %). <strong style={{ color: "var(--text-main)" }}>Projection, pas une garantie.</strong>
      </div>
      <div style={{ height: 260, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 12, left: 12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 12 }} tickFormatter={(d) => (d === 0 ? "Auj." : `J+${d}`)} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={70} domain={["auto", "auto"]} tickFormatter={(v) => `${(v / 1000).toLocaleString("fr-FR")} k`} />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg-base)", borderColor: "var(--border-color)" }}
              labelFormatter={(d) => (d === 0 ? "Aujourd'hui" : `J+${d}`)}
              formatter={(val, name) => (name === "band" || name === "bandLow" ? null : [fcfa(val), HZ[name.replace("h", "")]?.label || name])} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={start} stroke="var(--text-muted)" strokeDasharray="4 4" />
            <Area dataKey="bandLow" stackId="b" stroke="none" fill="transparent" legendType="none" />
            <Area dataKey="band" stackId="b" stroke="none" fill={longest.dir.color} fillOpacity={0.12} legendType="none" name="band" />
            {seg.map((g) => (
              <Line key={g.h} dataKey={`h${g.h}`} name={HZ[g.h]?.label || `${g.h} j`} stroke={HZ[g.h]?.color || "var(--accent-blue)"} strokeWidth={2.5} dot={false} connectNulls />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
