import React from 'react';

/**
 * PerSectorCompare — compare le PER d'une société à la moyenne de son secteur.
 * ---------------------------------------------------------------------------
 * Vulgarise la valorisation relative : le PER seul ne dit pas grand-chose ;
 * comparé à ses pairs sectoriels, il indique si le titre est « moins cher »
 * (potentiellement sous-évalué) ou « plus cher » que son secteur.
 *
 * Convention couleur (grille de lecture "value") :
 *   - PER SOUS la moyenne du secteur -> vert (moins cher que les pairs) ;
 *   - PER AU-DESSUS               -> ambre (plus cher que les pairs).
 *
 * Props :
 *   - per        : PER de la société (nombre) ;
 *   - sectorAvg  : moyenne des PER du secteur (nombre) ;
 *   - sectorName : nom du secteur ;
 *   - count      : nombre de titres du secteur ayant un PER significatif.
 */

const labelStyle = {
  fontSize: '0.8em',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  marginBottom: 5,
  fontWeight: 'bold',
};

const cardStyle = (accent) => ({
  background: 'var(--bg-panel)',
  padding: '15px',
  borderRadius: '10px',
  borderLeft: `4px solid ${accent}`,
});

/** Une barre horizontale (société ou secteur) avec libellé et valeur. */
function Bar({ label, value, width, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          fontSize: '0.68em', color: 'var(--text-muted)', width: 70,
          flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 8, background: 'var(--bg-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.72em', color: 'var(--text-main)', width: 40, textAlign: 'right', flexShrink: 0 }}>
        {value.toFixed(1)}×
      </span>
    </div>
  );
}

export default function PerSectorCompare({ per, sectorAvg, sectorName, count }) {
  const p = Number(per);
  const avg = Number(sectorAvg);
  const validPer = p > 0;                 // PER <= 0 = perte / non significatif
  const hasAvg = avg > 0 && count > 0;

  // Cas données insuffisantes : on reste informatif plutôt que d'afficher un vide.
  if (!validPer || !hasAvg) {
    return (
      <div style={cardStyle('var(--border-color)')}>
        <div style={labelStyle}>PER vs Secteur</div>
        <div style={{ fontSize: '1.3em', color: 'var(--text-main)', fontWeight: 900 }}>N/A</div>
        <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', marginTop: 4 }}>
          {!validPer ? 'PER non significatif' : 'Données secteur insuffisantes'}
        </div>
      </div>
    );
  }

  const deltaPct = ((p - avg) / avg) * 100;
  const below = p < avg;                                   // moins cher que le secteur
  const accent = below ? 'var(--up-color)' : 'var(--warn-color)';
  const max = Math.max(p, avg);
  const barWidth = (v) => `${Math.max(4, (v / max) * 100)}%`; // min 4% pour rester visible

  return (
    <div style={cardStyle(accent)}>
      <div style={labelStyle}>PER vs Secteur</div>

      {/* Valeur société + écart en % */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.3em', color: accent, fontWeight: 900 }}>{p.toFixed(1)}×</span>
        <span style={{ fontSize: '0.8em', color: accent, fontWeight: 700 }}>
          {below ? '▼' : '▲'} {Math.abs(deltaPct).toFixed(0)}&nbsp;% {below ? 'sous la moyenne' : 'au-dessus'}
        </span>
      </div>

      {/* Deux barres comparatives : société vs secteur */}
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Bar label="Société" value={p} width={barWidth(p)} color={accent} />
        <Bar label={sectorName} value={avg} width={barWidth(avg)} color="var(--text-muted)" />
      </div>

      <div style={{ fontSize: '0.72em', color: 'var(--text-muted)', marginTop: 6 }}>
        Moyenne {sectorName} · {count} titre{count > 1 ? 's' : ''}
      </div>
    </div>
  );
}
