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
  rente: {
    titre: 'Revenus & Dividendes',
    profil: 'Défensif',
    texte: "Vise un revenu régulier : privilégie les titres à fort rendement du dividende (> 7 %). Pour encaisser des coupons plutôt que parier sur la hausse du cours.",
  },
  value: {
    titre: 'Value Investing',
    profil: 'Contrarien',
    texte: "Cherche les titres sous-évalués : faible PER (< 12) et RSI bas (survente). Pari sur un retour du cours vers sa juste valeur.",
  },
  momentum: {
    titre: 'Momentum',
    profil: 'Offensif',
    texte: "Suit la tendance : titres en hausse récente et RSI dans une zone de force (50-70). Pari sur la continuation du mouvement.",
  },
};

const fcfa = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`;

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
      <h2 style={{ color: 'var(--text-main)', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
        Backtest Lab & Stratégies
      </h2>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', background: 'var(--bg-panel)', padding: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '15px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <FilterInput label="Capital (FCFA)" type="number" value={simCapital} onChange={(v) => setSimCapital(Number(v))} disabled={loadingSim} />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <FilterSelect label="Méthode" value={simStrategy} onChange={setSimStrategy} options={STRATEGY_OPTIONS} disabled={loadingSim} />
        </div>
        <button
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#9f7aea', color: 'white', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}
          onClick={runSimulationAndBacktest}
          disabled={loadingSim}
        >
          {loadingSim ? 'Calcul...' : 'Lancer Backtest'}
        </button>
      </div>

      {/* Explication de la méthode sélectionnée */}
      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px 18px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <strong style={{ color: 'var(--text-main)' }}>{desc.titre}</strong>
          <span style={{ fontSize: '0.72em', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-blue)', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2px 8px' }}>Profil {desc.profil}</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>{desc.texte}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82em', marginTop: '8px' }}>
          Les poids sont <strong style={{ color: 'var(--text-main)' }}>optimisés</strong> (rendement/risque, plafond 35 % par titre, diversifié) — plus de poids fixes.
        </div>
      </div>

      {backtestResult && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--accent-blue)', borderRadius: '10px', padding: '20px', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>Preuve de concept sur 3 ans</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em', marginBottom: '15px' }}>
            Vous investissez <strong style={{ color: 'var(--text-main)' }}>{fcfa(backtestResult.investedNow)}</strong> aujourd'hui
            (= somme des allocations ci-dessous) · portefeuille optimisé ({backtestResult.objectiveLabel}) ·
            <em> historique 3 ans illustratif (in-sample)</em>.
          </div>
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Il y a 3 ans, il valait</div>
              <div style={{ fontSize: '1.2em', color: 'var(--text-main)' }}>{fcfa(backtestResult.value3yAgo)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Plus-value 3 ans</div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: backtestResult.capitalGain >= 0 ? 'var(--up-color)' : 'var(--down-color)' }}>
                {backtestResult.capitalGain >= 0 ? '+ ' : '- '}{fcfa(Math.abs(backtestResult.capitalGain))}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Dividendes (est. 3 ans)</div>
              <div style={{ fontSize: '1.2em', color: 'var(--accent-blue)' }}>+ {fcfa(backtestResult.dividends)}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '30px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8em', textTransform: 'uppercase' }}>Valeur aujourd'hui</div>
              <div style={{ fontSize: '1.8em', color: backtestResult.perf3y >= 0 ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 'bold' }}>
                {fcfa(backtestResult.investedNow)}
                <span style={{ fontSize: '0.6em', marginLeft: '10px' }}>
                  ({backtestResult.perf3y > 0 ? '+' : ''}{backtestResult.perf3y.toFixed(2)}% sur 3 ans)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJECTION à scénarios (1-5 ans) */}
      {proj.length > 1 && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>Projection à 1-5 ans</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em', marginBottom: '15px' }}>
            Extrapolation du rendement annualisé (~{backtestResult.annualReturn?.toFixed(1)} %) et de la volatilité
            (~{backtestResult.annualVol?.toFixed(1)} %). <strong style={{ color: 'var(--text-main)' }}>Ce n'est pas une garantie</strong> —
            le passé ne prédit pas le futur.
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={proj.map(p => ({ year: p.year, low: p.low, band: p.high - p.low, median: p.median }))} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 12 }} tickFormatter={(y) => (y === 0 ? 'Départ' : `${y} an${y > 1 ? 's' : ''}`)} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => `${(v / 1000).toLocaleString('fr-FR')} k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)' }}
                  labelFormatter={(y) => (y === 0 ? 'Départ' : `${y} an${y > 1 ? 's' : ''}`)}
                  formatter={(val, name) => {
                    if (name === 'band') return null;
                    return [fcfa(name === 'low' ? val : val), name === 'median' ? 'Médian' : 'Pessimiste'];
                  }}
                />
                {/* Base invisible + bande d'incertitude (pessimiste -> optimiste) */}
                <Area dataKey="low" stackId="a" stroke="none" fill="transparent" />
                <Area dataKey="band" stackId="a" stroke="none" fill="var(--accent-blue)" fillOpacity={0.15} name="band" />
                {/* Trajectoire médiane */}
                <Line dataKey="median" stroke="var(--accent-blue)" strokeWidth={2.5} dot={{ r: 3 }} name="median" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* Tableau des scénarios par année */}
          <div style={{ overflowX: 'auto', marginTop: '10px' }}>
            <table style={{ width: '100%', textAlign: 'right', fontSize: '0.85em', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Horizon</th>
                  <th style={{ padding: '6px', color: 'var(--down-color)' }}>Pessimiste</th>
                  <th style={{ padding: '6px', color: 'var(--text-main)' }}>Médian</th>
                  <th style={{ padding: '6px', color: 'var(--up-color)' }}>Optimiste</th>
                </tr>
              </thead>
              <tbody>
                {proj.filter(p => p.year > 0).map(p => (
                  <tr key={p.year} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ textAlign: 'left', padding: '6px', color: 'var(--text-main)', fontWeight: 600 }}>{p.year} an{p.year > 1 ? 's' : ''}</td>
                    <td style={{ padding: '6px', color: 'var(--down-color)' }}>{fcfa(p.low)}</td>
                    <td style={{ padding: '6px', color: 'var(--text-main)', fontWeight: 700 }}>{fcfa(p.median)}</td>
                    <td style={{ padding: '6px', color: 'var(--up-color)' }}>{fcfa(p.high)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {proposedPortfolio.length > 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {proposedPortfolio.map(item => (
              <div key={item.sigle} style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', borderLeft: '4px solid #9f7aea' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: 'var(--text-main)' }}>{item.sigle}</div>
                  {item.weight != null && (
                    <span style={{ fontSize: '0.8em', fontWeight: 700, color: '#9f7aea', background: 'var(--bg-base)', borderRadius: '20px', padding: '3px 10px' }}>
                      {Math.round(item.weight * 100)} %
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>{item.nom}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                  <span>Quantité:</span> <strong>{item.shares}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-blue)' }}>
                  <span>Alloué:</span> <strong>{fcfa(item.total)}</strong>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--up-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={confirmPurchase}
            >
              Valider l'achat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
