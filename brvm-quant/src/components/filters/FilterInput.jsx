import React from 'react';

/**
 * FilterInput — champ de saisie de filtre (texte ou nombre), style unifié.
 * ------------------------------------------------------------------------
 * Même langage visuel que FilterSelect (classes .filter-field / .filter-control).
 *
 * Props :
 *   - label    : libellé optionnel au-dessus du champ ;
 *   - value / onChange : contrôlé ; onChange reçoit la NOUVELLE valeur ;
 *   - type     : "text" | "number" | ... (défaut "text") ;
 *   - inline   : label et champ sur une même ligne ;
 *   - Toutes les autres props (placeholder, min, disabled…) sont transmises.
 */
export default function FilterInput({
  label,
  value,
  onChange,
  type = 'text',
  inline = false,
  className = '',
  ...rest
}) {
  return (
    <div className={`filter-field${inline ? ' filter-field--inline' : ''}`}>
      {label && <label className="filter-label">{label}</label>}
      <input
        type={type}
        className={`filter-control ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}
