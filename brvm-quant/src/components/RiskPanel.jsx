/**
 * RiskPanel — section « Analyse du risque » sous le graphique de détail action.
 * ---------------------------------------------------------------------------
 * Informe (n'est pas un conseil) sur 4 dimensions, avec des INTERPRÉTATIONS en
 * clair sous chaque bloc, et une VaR à HORIZON choisi :
 *   1. Liquidité (volume + jours blancs ; illiquidité ≠ faible volatilité) ;
 *   2. Volatilité ajustée (jours actifs, détachements de dividende exclus) ;
 *   3. VaR historique par horizon (1 j / 1 sem / 2 sem / 1 mois) + CVaR ;
 *   4. Distribution des rendements (histogramme + kurtosis = queues épaisses).
 */
import React, { useState } from "react";

const LIQ_META = {
  Liquide: { color: "var(--up-color)" },
  "Peu liquide": { color: "var(--warn-color)" },
  Illiquide: { color: "var(--down-color)" },
};
const VAR_LABELS = { "1": "1 jour", "5": "1 semaine", "10": "2 semaines", "20": "1 mois" };

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

/** Ligne d'interprétation « en clair » sous un bloc. */
function Hint({ children }) {
  return <div style={{ fontSize: "0.8em", color: "var(--text-muted)", marginTop: 8, lineHeight: 1.45 }}>💡 {children}</div>;
}

function Histogram({ distribution }) {
  const counts = distribution?.counts || [];
  const edges = distribution?.edges || [];
  if (counts.length < 3) return null;
  const maxC = Math.max(...counts, 1);
  const n = counts.length, W = 100, H = 40, gap = 0.6, bw = W / n;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="Distribution des rendements">
      {counts.map((c, i) => {
        const mid = ((edges[i] ?? 0) + (edges[i + 1] ?? 0)) / 2;
        const h = (c / maxC) * H;
        const color = mid < -1e-9 ? "var(--down-color)" : mid > 1e-9 ? "var(--up-color)" : "var(--text-muted)";
        return <rect key={i} x={i * bw + gap / 2} y={H - h} width={bw - gap} height={h} fill={color} opacity={0.75} />;
      })}
      <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="var(--border-color)" strokeWidth={0.4} strokeDasharray="1 1" />
    </svg>
  );
}

export default function RiskPanel({ risk }) {
  const horizons = risk?.var?.horizons || {};
  const available = Object.keys(horizons);
  const [varH, setVarH] = useState(available.includes("10") ? "10" : available[0] || "1");

  if (!risk) return null;
  const liq = risk.liquidity || {};
  const vol = risk.volatility || {};
  const beta = risk.beta || {};
  const dist = risk.distribution || {};
  const liqMeta = LIQ_META[liq.level] || LIQ_META["Peu liquide"];
  const illiquidWarn = (liq.zeroTradePct || 0) >= 15 || liq.level === "Illiquide";
  const betaVal = beta.sector != null ? beta.sector : beta.market;
  const betaRef = beta.sector != null ? beta.sectorName : "Marché";
  const vh = horizons[varH] || {};

  const wrap = { background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 20, marginTop: 20 };
  const row = { display: "flex", gap: 14, flexWrap: "wrap" };
  const block = { background: "var(--bg-base)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "14px 16px", marginTop: 14 };

  return (
    <div style={wrap}>
      <h3 style={{ margin: "0 0 4px 0", color: "var(--text-main)" }}>Analyse du risque</h3>
      <div style={{ color: "var(--text-muted)", fontSize: "0.82em", marginBottom: 16 }}>
        Informatif — mesure la fiabilité et le risque du titre (n'est pas un conseil d'investissement).
      </div>

      {/* Liquidité + bêta */}
      <div style={row}>
        <Metric label="Liquidité" value={liq.level || "—"} color={liqMeta.color}
          sub={`${fmtInt(liq.avgVol)} titres/j · ${fmtPct(liq.zeroTradePct)} de jours blancs`} />
        <Metric label="Volume échangé (moy.)" value={`${fmtInt(liq.turnover)} F/j`} sub="Valeur négociée par séance" />
        <Metric label="Bêta sectoriel" value={betaVal != null ? betaVal.toFixed(2) : "—"} color="var(--accent-blue)"
          sub={`vs ${betaRef}`} />
      </div>
      <Hint>
        <strong>Liquidité</strong> : plus il y a de « jours blancs » (0 transaction), plus il est difficile
        d'acheter/vendre au prix voulu. <strong>Bêta</strong> : {betaVal != null ? `${betaVal.toFixed(2)} → ` : ""}
        1 = le titre bouge comme {betaRef.toLowerCase()} ; supérieur à 1 il amplifie les mouvements, inférieur à 1 il les amortit.
      </Hint>

      {illiquidWarn && (
        <div style={{ ...block, borderColor: "var(--warn-color)", fontSize: "0.85em", color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--warn-color)" }}>Risque d'illiquidité.</strong> Le cours peut rester plat par
          manque d'acheteurs/vendeurs — ce n'est <strong style={{ color: "var(--text-main)" }}>pas</strong> une absence de
          volatilité, mais un risque de ne pas pouvoir vendre au prix affiché.
        </div>
      )}

      {/* Volatilité */}
      <div style={{ ...row, marginTop: 14 }}>
        <Metric label="Volatilité annualisée" value={fmtPct(vol.adj)} color="var(--text-main)"
          sub={vol.adj !== vol.raw ? `ajustée (dividendes exclus) · brute ${fmtPct(vol.raw)}` : "écart-type annualisé des rendements"} />
      </div>
      <Hint>
        <strong>Volatilité</strong> : amplitude typique des variations sur un an. Environ {fmtPct(vol.adj)} signifie que le cours
        peut varier de cet ordre à la hausse comme à la baisse. La version <em>ajustée</em> exclut les baisses mécaniques des
        détachements de dividende pour ne pas surestimer le risque.
      </Hint>

      {/* VaR historique à horizon choisi */}
      {available.length > 0 && (
        <div style={block}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: "0.75em", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Perte maximale probable (VaR historique)</div>
            <div style={{ display: "inline-flex", border: "1px solid var(--border-color)", borderRadius: 20, overflow: "hidden" }}>
              {available.map((k) => (
                <button key={k} type="button" onClick={() => setVarH(k)}
                  style={{ border: "none", cursor: "pointer", padding: "4px 10px", fontSize: "0.8em", fontWeight: 700,
                    background: varH === k ? "var(--accent-blue)" : "transparent", color: varH === k ? "#fff" : "var(--text-muted)" }}>
                  {VAR_LABELS[k] || `${k} j`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 10 }}>
            <div>
              <div style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>Confiance 95 %</div>
              <div style={{ fontSize: "1.6em", fontWeight: 800, color: "var(--down-color)", fontVariantNumeric: "tabular-nums" }}>{fmtPct(vh.p95)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>Confiance 99 %</div>
              <div style={{ fontSize: "1.6em", fontWeight: 800, color: "var(--down-color)", fontVariantNumeric: "tabular-nums" }}>{fmtPct(vh.p99)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75em", color: "var(--text-muted)" }}>Pire cas moyen (CVaR)</div>
              <div style={{ fontSize: "1.6em", fontWeight: 800, color: "var(--down-color)", fontVariantNumeric: "tabular-nums" }}>{fmtPct(vh.cvar)}</div>
            </div>
          </div>
          <Hint>
            Sur <strong>{VAR_LABELS[varH]}</strong>, dans <strong>95 %</strong> des cas historiques la perte n'a pas dépassé
            <strong> {fmtPct(vh.p95)}</strong>. Les 5 % de scénarios les plus durs (chocs) sont pires — leur moyenne (CVaR) est
            de <strong>{fmtPct(vh.cvar)}</strong>. Calcul <em>historique</em> (pas de loi normale) : il intègre les chocs rares
            mais intenses du marché.
          </Hint>
        </div>
      )}

      {/* Distribution */}
      {(dist.counts || []).length > 2 && (
        <div style={block}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: "0.75em", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Distribution des rendements journaliers</div>
            <div style={{ fontSize: "0.8em", color: "var(--text-muted)" }}>
              Kurtosis <strong style={{ color: (dist.kurt || 0) > 3 ? "var(--down-color)" : "var(--text-main)" }}>{dist.kurt}</strong>
            </div>
          </div>
          <div style={{ marginTop: 8 }}><Histogram distribution={dist} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72em", color: "var(--text-muted)", marginTop: 2 }}>
            <span>← pertes</span><span>0</span><span>gains →</span>
          </div>
          <Hint>
            Chaque barre = fréquence d'un niveau de rendement (rouge = baisses, vert = hausses). Un <strong>pic central étroit</strong>
            avec des <strong>barres qui ressortent aux extrêmes</strong> signale beaucoup de journées calmes mais des chocs
            occasionnels violents.{(dist.kurt || 0) > 3 ? " Ici le kurtosis élevé confirme ces « queues épaisses » (fat tails)." : ""}
          </Hint>
        </div>
      )}
    </div>
  );
}
