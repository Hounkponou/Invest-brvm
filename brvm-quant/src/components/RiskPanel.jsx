/**
 * RiskPanel — section « Analyse du risque » sous le graphique de détail action.
 * ---------------------------------------------------------------------------
 * Informe (n'est pas un conseil) sur 4 dimensions, avec explications en clair :
 *   1. Liquidité (volume + jours blancs ; illiquidité ≠ faible volatilité) ;
 *   2. Volatilité ajustée (jours actifs, détachements de dividende exclus) + écart-type ;
 *   3. Distribution des rendements (histogramme + kurtosis = queues épaisses) ;
 *   4. VaR historique (quantile empirique, pas de loi normale) + bêta sectoriel.
 *
 * Rendu null si aucune donnée de risque (dégradation propre). Styles inline +
 * tokens de thème pour s'aligner sur le modal de détail.
 */
import React from "react";

const LIQ_META = {
  Liquide: { color: "var(--up-color)", bg: "var(--bg-base)" },
  "Peu liquide": { color: "var(--warn-color)", bg: "var(--bg-base)" },
  Illiquide: { color: "var(--down-color)", bg: "var(--bg-base)" },
};

const fmtPct = (v, d = 1) => (v == null || Number.isNaN(Number(v)) ? "—" : `${Number(v).toFixed(d)} %`);
const fmtInt = (v) => (v == null ? "—" : Math.round(Number(v)).toLocaleString("fr-FR"));

function Metric({ label, value, color, sub }) {
  return (
    <div style={{ background: "var(--bg-base)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 16px", flex: "1 1 190px", minWidth: 0 }}>
      <div style={{ fontSize: "0.75em", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: "1.4em", fontWeight: 800, color: color || "var(--text-main)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.8em", color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** Histogramme des rendements journaliers (barres SVG, rouge<0 / vert>0). */
function Histogram({ distribution }) {
  const counts = distribution?.counts || [];
  const edges = distribution?.edges || [];
  if (counts.length < 3) return null;
  const maxC = Math.max(...counts, 1);
  const n = counts.length;
  const W = 100, H = 40, gap = 0.6;
  const bw = W / n;
  return (
    <svg viewBox={`0 0 ${W} ${H + 6}`} width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="Distribution des rendements">
      {counts.map((c, i) => {
        const mid = ((edges[i] ?? 0) + (edges[i + 1] ?? 0)) / 2;
        const h = (c / maxC) * H;
        const color = mid < -1e-9 ? "var(--down-color)" : mid > 1e-9 ? "var(--up-color)" : "var(--text-muted)";
        return <rect key={i} x={i * bw + gap / 2} y={H - h} width={bw - gap} height={h} fill={color} opacity={0.75} />;
      })}
      {/* axe zéro */}
      <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="var(--border-color)" strokeWidth={0.4} strokeDasharray="1 1" />
    </svg>
  );
}

export default function RiskPanel({ risk, sector }) {
  if (!risk) return null;
  const liq = risk.liquidity || {};
  const vol = risk.volatility || {};
  const v = risk.var || {};
  const beta = risk.beta || {};
  const liqMeta = LIQ_META[liq.level] || LIQ_META["Peu liquide"];
  const illiquidWarn = (liq.zeroTradePct || 0) >= 15 || liq.level === "Illiquide";
  const betaVal = beta.sector != null ? beta.sector : beta.market;
  const betaRef = beta.sector != null ? beta.sectorName : "Marché";

  const wrap = { background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 20, marginTop: 20 };
  const row = { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 };

  return (
    <div style={wrap}>
      <h3 style={{ margin: "0 0 4px 0", color: "var(--text-main)" }}>Analyse du risque</h3>
      <div style={{ color: "var(--text-muted)", fontSize: "0.82em", marginBottom: 16 }}>
        Informatif — mesure la fiabilité et le risque du titre (n'est pas un conseil d'investissement).
      </div>

      {/* Liquidité */}
      <div style={row}>
        <Metric label="Liquidité" value={liq.level || "—"} color={liqMeta.color}
          sub={`${fmtInt(liq.avgVol)} titres/j · ${fmtPct(liq.zeroTradePct)} de jours blancs`} />
        <Metric label="Volume échangé (moy.)" value={`${fmtInt(liq.turnover)} F/j`} sub="Valeur négociée par séance" />
        <Metric label="Bêta sectoriel" value={betaVal != null ? betaVal.toFixed(2) : "—"} color="var(--accent-blue)"
          sub={`vs ${betaRef}${betaVal != null ? (betaVal > 1.1 ? " · plus sensible" : betaVal < 0.9 ? " · moins sensible" : " · en ligne") : ""}`} />
      </div>

      {illiquidWarn && (
        <div style={{ background: "var(--bg-base)", border: "1px solid var(--warn-color)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.85em", color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--warn-color)" }}>Risque d'illiquidité.</strong> Le cours peut rester plat par
          manque d'acheteurs/vendeurs — ce n'est <strong style={{ color: "var(--text-main)" }}>pas</strong> une absence de
          volatilité, mais un risque de ne pas pouvoir vendre au prix affiché.
        </div>
      )}

      {/* Volatilité + VaR */}
      <div style={row}>
        <Metric label="Volatilité annualisée" value={fmtPct(vol.adj)} color="var(--text-main)"
          sub={vol.adj !== vol.raw ? `ajustée (dividendes exclus) · brute ${fmtPct(vol.raw)}` : "écart-type annualisé des rendements"} />
        <Metric label="Perte max ~2 semaines" value={fmtPct(v.h10_95, 1)} color="var(--down-color)"
          sub="VaR historique 95 % (queues épaisses incluses)" />
        <Metric label="Perte max 1 jour" value={fmtPct(v.d95, 1)} color="var(--down-color)"
          sub={`95 % · pire cas (CVaR) ${fmtPct(v.cvar95, 1)}`} />
      </div>

      {/* Distribution */}
      {(risk.distribution?.counts || []).length > 2 && (
        <div style={{ background: "var(--bg-base)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: "0.75em", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Distribution des rendements journaliers</div>
            <div style={{ fontSize: "0.8em", color: "var(--text-muted)" }}>
              Kurtosis <strong style={{ color: (risk.distribution.kurt || 0) > 3 ? "var(--down-color)" : "var(--text-main)" }}>{risk.distribution.kurt}</strong>
              {(risk.distribution.kurt || 0) > 3 ? " · queues épaisses (chocs rares mais intenses)" : ""}
            </div>
          </div>
          <div style={{ marginTop: 8 }}><Histogram distribution={risk.distribution} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72em", color: "var(--text-muted)", marginTop: 2 }}>
            <span>← pertes</span><span>0</span><span>gains →</span>
          </div>
        </div>
      )}
    </div>
  );
}
