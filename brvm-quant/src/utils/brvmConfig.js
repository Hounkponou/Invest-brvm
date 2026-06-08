export const BRVM_SECTORS = {
  'BICC': 'Finances', 'BOAC': 'Finances', 'BOAN': 'Finances', 'BOABF': 'Finances',
  'BOAM': 'Finances', 'BICB': 'Finances', 'BOAB': 'Finances', 'BOAS': 'Finances',
  'ETIT': 'Finances', 'SGBC': 'Finances', 'SIBC': 'Finances', 'NSBC': 'Finances',
  'CORI': 'Finances', 'SAFC': 'Finances', 'ORGT': 'Finances',

  'BNBC': 'Distribution', 'ABJC': 'Distribution', 'CFAC': 'Distribution',
  'PRSC': 'Distribution', 'SHEC': 'Distribution', 'TTLC': 'Distribution', 'TTRC': 'Distribution',

  'CABC': 'Industrie', 'NTLC': 'Industrie', 'STBC': 'Industrie', 'SMBC': 'Industrie',
  'SLBC': 'Industrie', 'UNXC': 'Industrie', 'CILC': 'Industrie',

  'SOGC': 'Agriculture', 'SPHC': 'Agriculture', 'PALC': 'Agriculture', 'SICC': 'Agriculture',

  'CIEC': 'Services Publics', 'ONEC': 'Services Publics', 'SDCC': 'Services Publics',

  'SDSC':'Transport',
  
  'ORAC':'Telecommunications','ONTBF':'Telecommunications','SNTS': 'Telecommunications',
};

export const getSector = (symbole) => BRVM_SECTORS[symbole] || 'Autres';

export const UNIQUE_SECTORS = [...new Set(Object.values(BRVM_SECTORS))].sort();

export const PIE_COLORS = ['#089981', '#FFB300', '#2962FF', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722'];