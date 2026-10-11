import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { getSector, PIE_COLORS } from '../utils/brvmConfig';
import EmptyState from '../components/EmptyState';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR');
const signed = (n) => `${n >= 0 ? '+' : ''}${fmt(n)}`;
const plColor = (n) => (n >= 0 ? 'var(--up-color)' : 'var(--down-color)');

// Barre d'allocation empilée (remplace les camemberts) + légende.
function Allocation({ title, data, offset = 0 }) {
  const total = data.reduce((a, d) => a + (d.value || 0), 0) || 1;
  const slices = data
    .map((d, i) => ({ ...d, pct: (d.value / total) * 100, color: PIE_COLORS[(i + offset) % PIE_COLORS.length] }))
    .sort((a, b) => b.pct - a.pct);
  return (
    <div className="pf-alloc">
      <div className="dash-block-head"><span>{title}</span></div>
      <div className="pf-alloc-bar">
        {slices.map((s) => <i key={s.name} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.name} ${s.pct.toFixed(1)}%`} />)}
      </div>
      <ul className="pf-alloc-legend">
        {slices.map((s) => (
          <li key={s.name}>
            <span className="pf-swatch" style={{ background: s.color }} />
            <span className="pf-leg-name">{s.name}</span>
            <span className="dash-num pf-leg-pct">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Portfolio() {
  const {
    handleManualAdd, manualSymbol, setManualSymbol, marketData,
    manualShares, setManualShares, manualPrice, setManualPrice,
    groupedPortfolio, portfolioAnalytics, openSellModal,
  } = useOutletContext();

  const hasPositions = groupedPortfolio.length > 0 && portfolioAnalytics;
  const pl = hasPositions ? portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested : 0;
  const plPct = hasPositions && portfolioAnalytics.totalInvested ? (pl / portfolioAnalytics.totalInvested) * 100 : 0;

  return (
    <div className="pf">
      <header className="dash-masthead">
        <div>
          <div className="dash-kicker">Portefeuille · Suivi</div>
          <h2 className="dash-title">Mes positions</h2>
        </div>
      </header>

      {/* Ajout de position — barre d'outils sobre */}
      <form onSubmit={handleManualAdd} className="pf-form">
        <div className="pf-field pf-field-grow">
          <label className="pf-label">Action</label>
          <input list="stock-options" value={manualSymbol} onChange={(e) => setManualSymbol(e.target.value)} placeholder="Ex : SGBC ou société…" required className="pf-input" />
          <datalist id="stock-options">
            {[...marketData].sort((a, b) => a.symbole.localeCompare(b.symbole)).map((i) => (
              <option key={i.symbole} value={i.symbole}>{i.nom}</option>
            ))}
          </datalist>
        </div>
        <div className="pf-field">
          <label className="pf-label">Quantité</label>
          <input type="number" min="1" value={manualShares} onChange={(e) => setManualShares(e.target.value)} required placeholder="Qté" className="pf-input dash-num" />
        </div>
        <div className="pf-field">
          <label className="pf-label">PRU unitaire</label>
          <input type="number" min="1" step="any" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} required placeholder="Ex : 2 500" className="pf-input dash-num" />
        </div>
        <button type="submit" className="pf-add">Ajouter</button>
      </form>

      {!hasPositions ? (
        <EmptyState
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" /><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" /><path d="M16 12h5v3h-5a1.5 1.5 0 0 1 0-3z" /></svg>}
          title="Votre portefeuille est vide"
          message="Ajoutez une première position ci-dessus, ou constituez un portefeuille depuis le Backtest Lab."
        />
      ) : (
        <>
          {/* KPI à plat (pas de tuiles) */}
          <section className="pf-kpis">
            <div className="pf-kpi">
              <div className="pf-kpi-label">Valeur globale</div>
              <div className="pf-kpi-val dash-num">{fmt(portfolioAnalytics.totalValue)} F</div>
            </div>
            <div className="pf-kpi">
              <div className="pf-kpi-label">P/L latent</div>
              <div className="pf-kpi-val dash-num" style={{ color: plColor(pl) }}>
                {signed(pl)} F <span className="pf-kpi-sub">({plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="pf-kpi">
              <div className="pf-kpi-label">Capital investi</div>
              <div className="pf-kpi-val dash-num">{fmt(portfolioAnalytics.totalInvested)} F</div>
            </div>
            <div className="pf-kpi">
              <div className="pf-kpi-label">Profil de risque</div>
              <div className="pf-kpi-val" style={{ color: portfolioAnalytics.riskStatus.color, fontSize: '1.3rem' }}>
                {portfolioAnalytics.riskStatus.label}
              </div>
              {portfolioAnalytics.riskStatus.desc && <div className="pf-kpi-desc">{portfolioAnalytics.riskStatus.desc}</div>}
            </div>
          </section>

          {/* Allocation en barres empilées (remplace les camemberts) */}
          <div className="pf-grid2">
            <Allocation title="Répartition par actif" data={portfolioAnalytics.assetsChart} offset={0} />
            <Allocation title="Répartition par secteur" data={portfolioAnalytics.sectorsChart} offset={3} />
          </div>

          {/* Positions */}
          <section className="pf-block">
            <div className="dash-block-head"><span>Positions ({groupedPortfolio.length})</span><span className="dash-muted" style={{ fontWeight: 600 }}>P/L latent</span></div>
            <div className="pf-table-wrap">
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Actif</th><th className="r">Qté</th><th className="r">CMP</th><th className="r">Cours</th>
                    <th className="r">Valeur</th><th className="r">P/L latent</th><th>Signal</th><th aria-label="action" />
                  </tr>
                </thead>
                <tbody>
                  {groupedPortfolio.map((pos) => (
                    <tr key={pos.sigle}>
                      <td>
                        <span className="pf-sym">{pos.sigle}</span>
                        <span className="pf-sec">{getSector(pos.sigle)}</span>
                      </td>
                      <td className="r dash-num">{pos.totalShares}</td>
                      <td className="r dash-num">{fmt(pos.cmp)}</td>
                      <td className="r dash-num">{fmt(pos.currentPrice)}</td>
                      <td className="r dash-num">{fmt(pos.currentValue)}</td>
                      <td className="r dash-num" style={{ color: plColor(pos.profit), fontWeight: 700 }}>
                        {signed(pos.profit)}
                        <span className="pf-pl-pct"> ({pos.profit >= 0 ? '+' : ''}{pos.profitPct.toFixed(2)}%)</span>
                      </td>
                      <td>
                        <span className="pf-advice" style={{ color: pos.conseil.color }}>
                          <i style={{ background: pos.conseil.color }} />{pos.conseil.texte}
                        </span>
                      </td>
                      <td className="r">
                        <button onClick={() => openSellModal(pos.sigle, pos.totalShares)} className="pf-sell">Vendre</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
