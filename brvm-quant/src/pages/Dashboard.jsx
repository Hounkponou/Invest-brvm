import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import MarketTable from '../components/MarketTable';
import { getSector } from '../utils/brvmConfig';

const fmtInt = (n) => (Number(n) || 0).toLocaleString('fr-FR');
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(Number(n) || 0).toFixed(2)}%`;
const varColor = (v) => (v > 0 ? 'var(--up-color)' : v < 0 ? 'var(--down-color)' : 'var(--text-muted)');

function sessionDate(meta) {
  const raw = meta?.date;
  const d = raw ? new Date(raw) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Dashboard() {
  const {
    loadingMarket, globalSector, marketStats, marketData = [],
    setSelectedStock, riskBySymbol = {}, marketMeta,
  } = useOutletContext();

  // Performance moyenne par secteur (sur tout le marché) — triée, pour le ruban.
  const sectorPerf = useMemo(() => {
    const acc = {};
    marketData.forEach((s) => {
      const sec = getSector(s.symbole);
      const v = Number(s.variation) || 0;
      if (!acc[sec]) acc[sec] = { sum: 0, n: 0, up: 0, down: 0 };
      acc[sec].sum += v; acc[sec].n += 1;
      if (v > 0) acc[sec].up += 1; else if (v < 0) acc[sec].down += 1;
    });
    return Object.entries(acc)
      .map(([sector, v]) => ({ sector, avg: v.n ? v.sum / v.n : 0, count: v.n, up: v.up, down: v.down }))
      .sort((a, b) => b.avg - a.avg);
  }, [marketData]);

  const mostActive = useMemo(
    () => [...marketData].sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 5),
    [marketData],
  );

  if (loadingMarket) {
    return <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Synchronisation avec la BRVM en cours…</div>;
  }
  if (!marketStats) {
    return <div style={{ color: 'var(--text-muted)', padding: 40 }}>Aucune donnée de marché disponible.</div>;
  }

  const { sentiment, advances, declines, count, totalVol } = marketStats;
  const unchanged = Math.max(0, count - advances - declines);
  const scope = globalSector !== 'All' ? globalSector : 'toute la cote';
  // Échelle commune pour les mini-barres sectorielles (|%| max).
  const maxAbs = Math.max(0.5, ...sectorPerf.map((s) => Math.abs(s.avg)));

  return (
    <div className="dash">
      {/* ── Bandeau éditorial ─────────────────────────────────────────── */}
      <header className="dash-masthead">
        <div>
          <div className="dash-kicker">Bulletin de séance · BRVM</div>
          <h2 className="dash-title">
            {globalSector !== 'All' ? globalSector : 'Marché régional'}
          </h2>
        </div>
        <div className="dash-dateline">
          <span className="dash-dot" style={{ background: varColor(advances - declines) }} />
          {sessionDate(marketMeta)}
        </div>
      </header>

      {/* ── Chapô : résumé de la séance ───────────────────────────────── */}
      <p className="dash-lede">
        Séance <strong style={{ color: varColor(advances - declines) }}>{sentiment.toLowerCase()}</strong> sur {scope} :{' '}
        <strong style={{ color: 'var(--up-color)' }}>{advances}</strong> en hausse contre{' '}
        <strong style={{ color: 'var(--down-color)' }}>{declines}</strong> en baisse
        {unchanged ? <> et <strong>{unchanged}</strong> stables</> : null}.{' '}
        <span className="dash-num">{fmtInt(totalVol)}</span> titres échangés sur <span className="dash-num">{count}</span> valeurs.
      </p>

      {/* ── Respiration du marché : barre segmentée ───────────────────── */}
      <section className="dash-block">
        <div className="dash-block-head">
          <span>Respiration du marché</span>
          <span className="dash-breadth-legend">
            <em style={{ color: 'var(--up-color)' }}>{advances} ▲</em>
            <em style={{ color: 'var(--text-muted)' }}>{unchanged} =</em>
            <em style={{ color: 'var(--down-color)' }}>{declines} ▼</em>
          </span>
        </div>
        <div className="dash-breadth" role="img" aria-label={`${advances} hausses, ${unchanged} stables, ${declines} baisses`}>
          <span style={{ flex: advances || 0.0001, background: 'var(--up-color)' }} />
          <span style={{ flex: unchanged || 0.0001, background: 'var(--border-color)' }} />
          <span style={{ flex: declines || 0.0001, background: 'var(--down-color)' }} />
        </div>
      </section>

      {/* ── Performance sectorielle ───────────────────────────────────── */}
      <section className="dash-block">
        <div className="dash-block-head"><span>Performance sectorielle</span><span className="dash-num dash-muted">% moyen · séance</span></div>
        <div className="dash-sectors">
          {sectorPerf.map((s) => (
            <div key={s.sector} className="dash-sector-row">
              <span className="dash-sector-name">{s.sector}</span>
              <span className="dash-sector-bar">
                <span className="dash-sector-track">
                  <i
                    style={{
                      width: `${(Math.abs(s.avg) / maxAbs) * 50}%`,
                      [s.avg >= 0 ? 'left' : 'right']: '50%',
                      background: varColor(s.avg),
                    }}
                  />
                </span>
              </span>
              <span className="dash-num dash-sector-val" style={{ color: varColor(s.avg) }}>{fmtPct(s.avg)}</span>
              <span className="dash-num dash-sector-count">{s.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top / Flop ────────────────────────────────────────────────── */}
      <div className="topflop-grid" style={{ marginBottom: 24 }}>
        <div>
          <h3 className="dash-col-title" style={{ color: 'var(--up-color)' }}>Plus fortes hausses</h3>
          <MarketTable items={marketStats.top3} onSelect={setSelectedStock} riskBySymbol={riskBySymbol} initialSort={{ key: 'variation', dir: 'desc' }} compact />
        </div>
        <div>
          <h3 className="dash-col-title" style={{ color: 'var(--down-color)' }}>Plus fortes baisses</h3>
          <MarketTable items={marketStats.flop3} onSelect={setSelectedStock} riskBySymbol={riskBySymbol} initialSort={{ key: 'variation', dir: 'asc' }} compact />
        </div>
      </div>

      {/* ── Plus actifs ───────────────────────────────────────────────── */}
      <section className="dash-block">
        <div className="dash-block-head"><span>Valeurs les plus actives</span><span className="dash-num dash-muted">volume · séance</span></div>
        <MarketTable items={mostActive} onSelect={setSelectedStock} riskBySymbol={riskBySymbol} initialSort={{ key: 'volume', dir: 'desc' }} compact />
      </section>

      <div className="dash-footnote">
        Pour trier et filtrer l'ensemble des <span className="dash-num">{count}</span> valeurs, ouvrez l'<strong style={{ color: 'var(--text-main)' }}>Analyse</strong>.
      </div>
    </div>
  );
}
