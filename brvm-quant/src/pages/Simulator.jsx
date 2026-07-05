import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { FilterSelect, FilterInput } from '../components/filters';

// Stratégies de simulation
const STRATEGY_OPTIONS = [
  { value: 'rente', label: 'Revenus & Dividendes' },
  { value: 'value', label: 'Value Investing' },
  { value: 'momentum', label: 'Momentum' },
];

export default function Simulator() {
  const { 
    simCapital, setSimCapital, 
    simStrategy, setSimStrategy, 
    runSimulationAndBacktest, loadingSim, 
    backtestResult, proposedPortfolio, confirmPurchase 
  } = useOutletContext();

  return (
    <div>
      <h2 style={{ color: 'var(--text-main)', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
        🧪 Backtest Lab & Strategies
      </h2>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', background: 'var(--bg-panel)', padding: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <FilterInput
            label="Capital (FCFA)"
            type="number"
            value={simCapital}
            onChange={(v) => setSimCapital(Number(v))}
            disabled={loadingSim}
          />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <FilterSelect
            label="Méthode"
            value={simStrategy}
            onChange={setSimStrategy}
            options={STRATEGY_OPTIONS}
            disabled={loadingSim}
          />
        </div>
        <button
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#9f7aea', color: 'white', fontWeight: 'bold', cursor: 'pointer', height: '42px' }} 
          onClick={runSimulationAndBacktest} 
          disabled={loadingSim}
        >
          {loadingSim ? 'Calcul...' : 'Lancer Backtest'}
        </button>
      </div>

      {backtestResult && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--accent-blue)', borderRadius: '10px', padding: '20px', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Preuve de concept sur 3 ans</h3>
          <div style={{ display: 'flex', gap: '30px' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Gain Capital</div>
              <div style={{ fontSize: '1.2em', color: 'var(--text-main)' }}>{backtestResult.finalCapital.toLocaleString()} F</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Dividendes</div>
              <div style={{ fontSize: '1.2em', color: 'var(--accent-blue)' }}>+ {backtestResult.dividends.toLocaleString()} F</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '30px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>TOTAL RETURN</div>
              <div style={{ fontSize: '1.8em', color: backtestResult.perfTotal >= 0 ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 'bold' }}>
                {backtestResult.totalReturnVal.toLocaleString()} F 
                <span style={{ fontSize: '0.6em', marginLeft: '10px' }}>
                  ({backtestResult.perfTotal > 0 ? '+' : ''}{backtestResult.perfTotal.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {proposedPortfolio.length > 0 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {proposedPortfolio.map(item => (
              <div key={item.sigle} style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', borderLeft: '4px solid #9f7aea' }}>
                <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: 'var(--text-main)' }}>{item.sigle}</div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>{item.nom}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                  <span>Quantité:</span> <strong>{item.shares}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-blue)' }}>
                  <span>Alloué:</span> <strong>{item.total.toLocaleString()} F</strong>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button 
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--up-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }} 
              onClick={confirmPurchase}
            >
              ✅ Valider l'Achat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}