import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getSector, PIE_COLORS } from '../utils/brvmConfig';

export default function Portfolio() {
  const { 
    handleManualAdd, manualSymbol, setManualSymbol, marketData, 
    manualShares, setManualShares, manualPrice, setManualPrice, 
    groupedPortfolio, portfolioAnalytics, openSellModal 
  } = useOutletContext();

  return (
    <div>
      <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '15px', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-main)', margin: 0 }}>💼 Portfolio Cloud & Risque</h2>
      </div>

      {/* FORMULAIRE D'AJOUT MANUEL */}
      <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>➕ Ajouter une position</h3>
        <form onSubmit={handleManualAdd} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Rechercher l'action</label>
            <input 
              list="stock-options" 
              value={manualSymbol} 
              onChange={(e) => setManualSymbol(e.target.value)} 
              placeholder="Ex: SGBC ou Société..." 
              required
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} 
            />
            <datalist id="stock-options">
              {[...marketData].sort((a,b) => a.symbole.localeCompare(b.symbole)).map(i => (
                <option key={i.symbole} value={i.symbole}>{i.nom}</option>
              ))}
            </datalist>
          </div>
          <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Quantité</label>
            <input style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} type="number" min="1" value={manualShares} onChange={(e) => setManualShares(e.target.value)} required placeholder="Qté" />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>PRU Unitaire</label>
            <input style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'var(--text-main)' }} type="number" min="1" step="any" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} required placeholder="Ex: 2500" />
          </div>
          <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--up-color)', color: 'white', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}>Ajouter</button>
        </form>
      </div>

      {groupedPortfolio.length === 0 || !portfolioAnalytics ? (
        <div style={{ textAlign: 'center', padding: '50px', background: 'var(--bg-panel)', borderRadius: '10px', color: 'var(--text-muted)' }}>
          Votre portefeuille est vide.
        </div>
      ) : (
        <>
          {/* ANALYTIQUES ET GRAPHIQUES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85em', fontWeight: 'bold' }}>Valeur Globale</div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '5px' }}>
                  {portfolioAnalytics.totalValue.toLocaleString()} F
                </div>
                <div style={{ fontSize: '0.9em', color: (portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested) >= 0 ? 'var(--up-color)' : 'var(--down-color)', marginTop: '5px' }}>
                                  P/L : {(portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested) >= 0 ? '+' : ''}{(portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested).toLocaleString()} F 
                                  {' '}
                  <span style={{ fontSize: '0.9em', fontWeight: 'bold' }}>
                    ({((portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested) / portfolioAnalytics.totalInvested >= 0 ? '+' : '')}
                    {(((portfolioAnalytics.totalValue - portfolioAnalytics.totalInvested) / portfolioAnalytics.totalInvested) * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', borderLeft: `4px solid ${portfolioAnalytics.riskStatus.color}` }}>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85em', fontWeight: 'bold' }}>Profil de Risque</div>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: portfolioAnalytics.riskStatus.color, marginTop: '5px' }}>
                  {portfolioAnalytics.riskStatus.label}
                </div>
              </div>
            </div>

            
            <div style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <div style={{ flex: 1, height: '220px', minWidth: '150px' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: 'bold' }}>Actifs</div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolioAnalytics.assetsChart} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                      {portfolioAnalytics.assetsChart.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, height: '220px', minWidth: '150px', borderLeft: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: 'bold' }}>Secteurs</div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolioAnalytics.sectorsChart} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                      {portfolioAnalytics.sectorsChart.map((e, i) => <Cell key={i} fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>
          
          {/* TABLEAU DES POSITIONS */}
          <div style={{ overflowX: 'auto', background: 'var(--bg-panel)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)' }}>
                  <th style={{ padding: '15px' }}>Actif</th>
                  <th style={{ padding: '15px' }}>Qté</th>
                  <th style={{ padding: '15px' }}>CMP (Investi)</th>
                  <th style={{ padding: '15px' }}>Cours (Valeur)</th>
                  <th style={{ padding: '15px' }}>P/L Latent</th>
                  <th style={{ padding: '15px' }}>Conseil IA</th>
                  <th style={{ padding: '15px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {groupedPortfolio.map((pos) => (
                  <tr key={pos.sigle} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '15px' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '1.1em' }}>{pos.sigle}</strong><br/>
                      <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{getSector(pos.sigle)}</span>
                    </td>
                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{pos.totalShares}</td>
                    <td style={{ padding: '15px' }}>
                      {Math.round(pos.cmp).toLocaleString()} F<br/>
                      <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Tot: {pos.totalInvested.toLocaleString()}</span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      {pos.currentPrice.toLocaleString()} F<br/>
                      <span style={{ fontSize: '0.8em', color: 'var(--accent-blue)' }}>Val: {pos.currentValue.toLocaleString()}</span>
                    </td>
                    <td style={{ padding: '15px', color: pos.profit >= 0 ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 'bold' }}>
                      {pos.profit >= 0 ? '+' : ''}{Math.round(pos.profit).toLocaleString()} F <br/>
                      <span style={{ fontSize: '0.8em' }}>({pos.profit >= 0 ? '+' : ''}{pos.profitPct.toFixed(2)}%)</span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{ color: pos.conseil.color, fontWeight: 'bold', border: `1px solid ${pos.conseil.color}`, padding: '6px 10px', borderRadius: '20px', fontSize: '0.85em', display: 'inline-block' }}>
                        {pos.conseil.texte}
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <button 
                        onClick={() => openSellModal(pos.sigle, pos.totalShares)} 
                        style={{ background: 'transparent', border: '1px solid var(--down-color)', color: 'var(--down-color)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Vendre
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}