import React from 'react';

/**
 * DataFreshness — indicateur de fraîcheur des données affichées.
 * --------------------------------------------------------------
 * Montre le JOUR de la séance et l'HEURE de dernière actualisation, avec une
 * pastille de couleur (verte = récent, ambre = périmé > 24 h) pour éviter toute
 * confusion sur l'ancienneté des données.
 *
 * Props :
 *   - date        : date de la séance (chaîne 'YYYY-MM-DD') ;
 *   - generatedAt : horodatage ISO de génération du snapshot (optionnel).
 */
export default function DataFreshness({ date, generatedAt }) {
  if (!date) return null;

  // Jour de séance, formaté en français
  const sessionLabel = new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // Heure d'actualisation (locale) + âge -> couleur de pastille
  let majLabel = null;
  let dotColor = 'var(--text-muted)';
  if (generatedAt) {
    const g = new Date(generatedAt);
    majLabel = g.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const ageH = (Date.now() - g.getTime()) / 3600000;
    dotColor = ageH > 24 ? 'var(--warn-color)' : 'var(--up-color)';
  }

  return (
    <div
      title="Fraîcheur des données affichées (séance et dernière actualisation)"
      style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flex: 'none' }} />
      <span>
        Séance <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{sessionLabel}</strong>
        {majLabel ? ` · maj ${majLabel}` : ''}
      </span>
    </div>
  );
}
