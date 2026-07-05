import React from 'react';

/**
 * FilterSelect — liste déroulante de filtre, style unifié dans toute l'app.
 * ------------------------------------------------------------------------
 * S'appuie sur les classes CSS communes (.filter-field / .filter-control),
 * donc l'apparence (et le thème Dark/Solar) est cohérente partout.
 *
 * Props :
 *   - label    : libellé optionnel affiché au-dessus (omis → contrôle seul,
 *                utile dans le TopHeader) ;
 *   - value    : valeur sélectionnée (contrôlé) ;
 *   - onChange : reçoit directement la NOUVELLE valeur (pas l'event) ;
 *   - options  : tableau [{ value, label }] ;
 *   - disabled : désactive le contrôle ;
 *   - inline   : disposition label ⟷ contrôle sur une ligne ;
 *   - className: classes additionnelles sur le <select>.
 */
export default function FilterSelect({
  label,
  value,
  onChange,
  options = [],
  disabled = false,
  inline = false,
  className = '',
  ...rest
}) {
  return (
    <div className={`filter-field${inline ? ' filter-field--inline' : ''}`}>
      {label && <label className="filter-label">{label}</label>}
      <select
        className={`filter-control ${className}`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
