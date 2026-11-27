/** Owner-defined ImmoGR target localities. Exact names and group membership come from the owner list (2026-11-27). */
export type ImmoGRLocality = { id: string; name: string; canton: 'GR'; group: 0 | 1 | 2 };
export type ImmoGRGroupMode = 'group1' | 'group2' | 'both' | 'chur';
export const IMMOGR_LOCALITIES: ImmoGRLocality[] = [
  { id: 'chur', name: "Chur", canton: 'GR', group: 0 },
  { id: 'araschgen', name: "Araschgen", canton: 'GR', group: 1 },
  { id: 'bonaduz', name: "Bonaduz", canton: 'GR', group: 1 },
  { id: 'churwalden', name: "Churwalden", canton: 'GR', group: 1 },
  { id: 'domat-ems', name: "Domat/Ems", canton: 'GR', group: 1 },
  { id: 'felsberg', name: "Felsberg", canton: 'GR', group: 1 },
  { id: 'haldenstein', name: "Haldenstein", canton: 'GR', group: 1 },
  { id: 'igis', name: "Igis", canton: 'GR', group: 1 },
  { id: 'landquart', name: "Landquart", canton: 'GR', group: 1 },
  { id: 'maladers', name: "Maladers", canton: 'GR', group: 1 },
  { id: 'malix', name: "Malix", canton: 'GR', group: 1 },
  { id: 'passugg', name: "Passugg", canton: 'GR', group: 1 },
  { id: 'praden', name: "Praden", canton: 'GR', group: 1 },
  { id: 'reichenau', name: "Reichenau", canton: 'GR', group: 1 },
  { id: 'rhazuns', name: "Rhäzüns", canton: 'GR', group: 1 },
  { id: 'tamins', name: "Tamins", canton: 'GR', group: 1 },
  { id: 'trimmis', name: "Trimmis", canton: 'GR', group: 1 },
  { id: 'trin', name: "Trin", canton: 'GR', group: 1 },
  { id: 'trin-digg', name: "Trin Digg", canton: 'GR', group: 1 },
  { id: 'trin-mulin', name: "Trin Mulin", canton: 'GR', group: 1 },
  { id: 'tschiertschen', name: "Tschiertschen", canton: 'GR', group: 1 },
  { id: 'untervaz', name: "Untervaz", canton: 'GR', group: 1 },
  { id: 'zizers', name: "Zizers", canton: 'GR', group: 1 },
  { id: 'cazis', name: "Cazis", canton: 'GR', group: 2 },
  { id: 'domleschg', name: "Domleschg", canton: 'GR', group: 2 },
  { id: 'flasch', name: "Fläsch", canton: 'GR', group: 2 },
  { id: 'flims', name: "Flims", canton: 'GR', group: 2 },
  { id: 'grusch', name: "Grüsch", canton: 'GR', group: 2 },
  { id: 'jenins', name: "Jenins", canton: 'GR', group: 2 },
  { id: 'laax', name: "Laax", canton: 'GR', group: 2 },
  { id: 'lenzerheide', name: "Lenzerheide", canton: 'GR', group: 2 },
  { id: 'maienfeld', name: "Maienfeld", canton: 'GR', group: 2 },
  { id: 'malans', name: "Malans", canton: 'GR', group: 2 },
  { id: 'mastrils', name: "Mastrils", canton: 'GR', group: 2 },
  { id: 'parpan', name: "Parpan", canton: 'GR', group: 2 },
  { id: 'pratval', name: "Pratval", canton: 'GR', group: 2 },
  { id: 'rodels', name: "Rodels", canton: 'GR', group: 2 },
  { id: 'rothenbrunnen', name: "Rothenbrunnen", canton: 'GR', group: 2 },
  { id: 'says', name: "Says", canton: 'GR', group: 2 },
  { id: 'scharans', name: "Scharans", canton: 'GR', group: 2 },
  { id: 'sils-im-domleschg', name: "Sils im Domleschg", canton: 'GR', group: 2 },
  { id: 'st-peter', name: "St. Peter", canton: 'GR', group: 2 },
  { id: 'summaprada', name: "Summaprada", canton: 'GR', group: 2 },
  { id: 'thusis', name: "Thusis", canton: 'GR', group: 2 },
  { id: 'valbella', name: "Valbella", canton: 'GR', group: 2 },
];
export function localitiesForMode(mode: ImmoGRGroupMode): ImmoGRLocality[] {
  return IMMOGR_LOCALITIES.filter((item) => mode === 'chur' ? item.id === 'chur' : mode === 'both' ? item.group === 1 || item.group === 2 : (mode === 'group1' ? item.group === 1 : item.group === 2));
}
export function isImmoGRGroupMode(value: unknown): value is ImmoGRGroupMode {
  return value === 'group1' || value === 'group2' || value === 'both' || value === 'chur';
}
