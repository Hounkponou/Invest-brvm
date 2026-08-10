// Sectorisation MODERNE (GICS-like), exhaustive : les 47 titres cotés, 7 secteurs.
export const BRVM_SECTORS = {
  // --- Services Financiers (16) ---
  'BICC': 'Services Financiers', 'BOAC': 'Services Financiers', 'BOAN': 'Services Financiers',
  'BOABF': 'Services Financiers', 'BOAM': 'Services Financiers', 'BOAB': 'Services Financiers',
  'BOAS': 'Services Financiers', 'ETIT': 'Services Financiers', 'ECOC': 'Services Financiers',
  'SGBC': 'Services Financiers', 'SIBC': 'Services Financiers', 'NSBC': 'Services Financiers',
  'CBIBF': 'Services Financiers', 'SAFC': 'Services Financiers', 'ORGT': 'Services Financiers',
  'BICB': 'Services Financiers',

  // --- Télécommunications (3) ---
  'SNTS': 'Telecommunications', 'ONTBF': 'Telecommunications', 'ORAC': 'Telecommunications',

  // --- Services Publics (2) ---
  'CIEC': 'Services Publics', 'SDCC': 'Services Publics',

  // --- Énergie (4) ---
  'SHEC': 'Energie', 'TTLC': 'Energie', 'TTLS': 'Energie', 'SMBC': 'Energie',

  // --- Consommation de Base (9) : agriculture, alimentaire, boissons ---
  'SOGC': 'Consommation de Base', 'SPHC': 'Consommation de Base', 'PALC': 'Consommation de Base',
  'SICC': 'Consommation de Base', 'SIVC': 'Consommation de Base', 'SCRC': 'Consommation de Base',
  'SLBC': 'Consommation de Base', 'NTLC': 'Consommation de Base', 'UNLC': 'Consommation de Base',

  // --- Consommation Discrétionnaire (6) : auto, équipement, loisirs, textile ---
  'CFAC': 'Consommation Discretionnaire', 'PRSC': 'Consommation Discretionnaire',
  'ABJC': 'Consommation Discretionnaire', 'BNBC': 'Consommation Discretionnaire',
  'LNBB': 'Consommation Discretionnaire', 'UNXC': 'Consommation Discretionnaire',

  // --- Industriels (7) : industrie, BTP, logistique ---
  'CABC': 'Industriels', 'FTSC': 'Industriels', 'NEIC': 'Industriels',
  'STBC': 'Industriels', 'SEMC': 'Industriels', 'SDSC': 'Industriels', 'STAC': 'Industriels',
};

export const getSector = (symbole) => BRVM_SECTORS[symbole] || 'Autres';

export const UNIQUE_SECTORS = [...new Set(Object.values(BRVM_SECTORS))].sort();

export const PIE_COLORS = ['#089981', '#FFB300', '#2962FF', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722'];