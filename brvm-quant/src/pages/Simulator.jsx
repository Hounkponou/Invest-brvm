import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { FilterSelect, FilterInput } from '../components/filters';

// Stratégies de simulation + explication CLAIRE de chacune.
const STRATEGY_OPTIONS = [
  { value: 'rente', label: 'Revenus & Dividendes' },
  { value: 'value', label: 'Value Investing' },
  { value: 'momentum', label: 'Momentum' },
];

const STRATEGY_DESC = {
  rente: { titre: 'Revenus & Dividendes', profil: 'Défensif', texte: "Vise un revenu régulier : privilégie les titres à fort rendement du dividende (> 7 %). Pour encaisser des coupons plutôt que parier sur la hausse du cours." },
  value: { titre: 'Value Investing', profil: 'Contrarien', texte: "Cherche les titres sous-évalués : faible PER (< 12) et RSI bas (survente). Pari sur un retour du cours vers sa juste valeur." },
  momentum: { titre: 'Momentum', profil: 'Offensif', texte: "Suit la tendance : titres en hausse récente et RSI dans une zone de force (50-70). Pari sur la continuation du mouvement." },
};

const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`;
const signed = (n) => `${n >= 0 ? '+ ' : '- '}${fcfa(Math.abs(n))}`;
const plColor = (n) => (n >= 0 ? 'var(--up-color)' : 'var(--down-color)');

export default function Simulator() {
  const {
    simCapital, setSimCapital,
    simStrategy, setSimStrategy,
    runSimulationAndBacktest, loadingSim,
    backtestResult, proposedPortfolio, confirmPurchase,
  } = useOutletContext();

  const desc = STRATEGY_DESC[simStrategy] || STRATEGY_DESC.rente;
  const proj = backtestResult?.projection || [];

  return (
    <div style={{ fontVariantNumeric: 'tabular-nums' }}>
      <header className="dash-masthead">
        <div>
          <div className="dash-kicker">Backtest Lab · Stratégies</div>
          <h2 className="dash-title">Simulateur de portefeuille</h2>
        </div>
      </header>

      {/* Contrôles */}
      <div className="pf-form">
        <div style={{ flex: '1 1 200px' }}>
          <FilterInput label="Capital (FCFA)" type="number" value={simCapital} onChange={(v) => setSimCapital(Number(v))} disabled={loadingSim} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <FilterSelect label="Méthode" value={simStrategy} onChange={setSimStrategy} options={STRATEGY_OPTIONS} disabled={loadingSim} />
        </div>
        <button className="pf-add" onClick={runSimulationAndBacktest} disabled={loadingSim}>
          {loadingSim ? 'Calcul…' : 'Lancer le backtest'}
        </button>
      </div>

      {/* Méthode sélectionnée */}
      <div style={{ margin: '0 0 28px' }}>
        <div className="dash-block-head">
          <span>Méthode · {desc.titre}</span>
          <span className="dash-muted" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>Profil {desc.profil}</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.55, margin: '0 0 6px', maxWidth: '74ch' }}>{desc.texte}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
          Poids <strong style={{ color: 'var(--text-main)' }}>optimisés</strong> (rendement/risque, plafond 35 % par titre, diversifié) — plus de poids fixes.
        </p>
      </div>

      {/* Preuve de concept 3 ans */}
      {backtestResult && (
        <section className="dash-block">
          <div className="dash-block-head">
            <span>Preuve de concept · 3 ans</span>
            <span className="dash-muted" style={{ fontWeight: 600 }}>historique in-sample, illustratif</span>
          </div>
          <p className="dash-muted" style={{ fontSize: '0.82rem', margin: '0 0 12px', maxWidth: '82ch' }}>
            Vous investissez <strong style={{ color: 'var(--text-main)' }}>{fcfa(backtestResult.investedNow)}</strong> aujourd'hui (= somme des allocations ci-dessous)
            {backtestResult.cashRestant > 0 && <> · reste <strong style={{ color: 'var(--text-main)' }}>{fcfa(backtestResult.cashRestant)}</strong> en liquidités (actions entières)</>} · {backtestResult.objectiveLabel}.
          </p>
          <div className="pf-kpis" style={{ marginBottom: 0 }}>
            <div className="pf-kpi"><div className="pf-kpi-label">Valeur il y a 3 ans</div><div className="pf-kpi-val dash-num">{fcfa(backtestResult.value3yAgo)}</div></div>
            <div className="pf-kpi"><div className="pf-kpi-label">Plus-value 3 ans</div><div className="pf-kpi-val dash-num" style={{ color: plColor(backtestResult.capitalGain) }}>{signed(backtestResult.capitalGain)}</div></div>
            <div className="pf-kpi"><div className="pf-kpi-label">Dividendes est. 3 ans</div><div className="pf-kpi-val dash-num" style={{ color: 'var(--accent-blue)' }}>+ {fcfa(backtestResult.dividends)}</div></div>
            <div className="pf-kpi">
              <div className="pf-kpi-label">Valeur aujourd'hui</div>
              <div className="pf-kpi-val dash-num" style={{ color: plColor(backtestResult.perf3y) }}>
                {fcfa(backtestResult.investedNow)} <span className="pf-kpi-sub">({backtestResult.perf3y > 0 ? '+' : ''}{backtestResult.perf3y.toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Projection 1-5 ans */}
      {proj.length > 1 && (
        <section className="dash-block">
          <div className="dash-block-head">
            <span>Projection · 1-5 ans</span>
            <span className="dash-muted" style={{ fontWeight: 600 }}>rend. ~{backtestResult.annualReturn?.toFixed(1)} % · vol. ~{backtestResult.annualVol?.toFixed(1)} %</span>
          </div>
          <p className="dash-muted" style={{ fontSize: '0.82rem', margin: '0 0 12px', maxWidth: '82ch' }}>
            Extrapolation du rendement annualisé et de la volatilité. <strong style={{ color: 'var(--text-main)' }}>Ce n'est pas une garantie</strong> — le passé ne prédit pas le futur.
          </p>
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, height: 272 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={proj.map((p) => ({ year: p.year, low: p.low, band: p.high - p.low, median: p.median }))} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 12 }} tickFormatter={(y) => (y === 0 ? 'Départ' : `${y} an${y > 1 ? 's' : ''}`)} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => `${(v / 1000).toLocaleString('fr-FR')} k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)' }}
                  labelFormatter={(y) => (y === 0 ? 'Départ' : `${y} an${y > 1 ? 's' : ''}`)}
                  formatter={(val, name) => (name === 'band' ? null : [fcfa(val), name === 'median' ? 'Médian' : 'Pessimiste'])}
                />
                <Area dataKey="low" stackId="a" stroke="none" fill="transparent" />
                <Area dataKey="band" stackId="a" stroke="none" fill="var(--accent-blue)" fillOpacity={0.15} name="band" />
                <Line dataKey="median" stroke="var(--accent-blue)" strokeWidth={2.5} dot={{ r: 3 }} name="median" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="pf-table-wrap" style={{ marginTop: 14 }}>
            <table className="pf-table">
              <thead>
                <tr><th>Horizon</th><th className="r">Pessimiste</th><th className="r">Médian</th><th className="r">Optimiste</th></tr>
              </thead>
              <tbody>
                {proj.filter((p) => p.year > 0).map((p) => (
                  <tr key={p.year}>
                    <td style={{ fontWeight: 600 }}>{p.year} an{p.year > 1 ? 's' : ''}</td>
                    <td className="r dash-num" style={{ color: 'var(--down-color)' }}>{fcfa(p.low)}</td>
                    <td className="r dash-num" style={{ fontWeight: 700 }}>{fcfa(p.median)}</td>
                    <td className="r dash-num" style={{ color: 'var(--up-color)' }}>{fcfa(p.high)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Portefeuille proposé — table (remplace la grille de cartes) */}
      {proposedPortfolio.length > 0 && (
        <section className="dash-block">
          <div className="dash-block-head"><span>Portefeuille proposé ({proposedPortfolio.length})</span><span className="dash-muted" style={{ fontWeight: 600 }}>poids · alloué</span></div>
          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr><th>Titre</th><th className="r">Poids</th><th className="r">Quantité</th><th className="r">Alloué</th></tr>
              </thead>
              <tbody>
                {proposedPortfolio.map((item) => (
                  <tr key={item.sigle}>
                    <td><span className="pf-sym">{item.sigle}</span><span className="pf-sec">{item.nom}</span></td>
                    <td className="r dash-num" style={{ fontWeight: 700 }}>{item.weight != null ? `${Math.round(item.weight * 100)} %` : '—'}</td>
                    <td className="r dash-num">{item.shares}</td>
                    <td className="r dash-num" style={{ color: 'var(--accent-blue)' }}>{fcfa(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button className="pf-add" style={{ background: 'var(--up-color)' }} onClick={confirmPurchase}>Valider l'achat</button>
          </div>
        </section>
      )}
    </div>
  );
}
