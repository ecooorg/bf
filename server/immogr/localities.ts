/** Owner-defined ImmoGR target localities. Exact names and group membership come from the owner list (2026-11-27). */
export type ImmoGRLocality = { id: string; name: string; canton: 'GR'; group: 1 | 2 };
export type ImmoGRGroupMode = 'group1' | 'group2' | 'both';
export const IMMOGR_LOCALITIES: ImmoGRLocality[] = [
  { id: "araschgen", name: "Araschgen", canton: 'GR', group: 1 },
  { id: "bonadz", name: "Bonaduz", canton: 'GR', group: 1 },
  { id: "chrwalden", name: "Churwalden", canton: 'GR', group: 1 },
  { id: "domat-ems", name: "Domat/Ems", canton: 'GR', group: 1 },
  { id: "elsberg", name: "Felsberg", canton: 'GR', group: 1 },
  { id: "haldenstein", name: "Haldenstein", canton: 'GR', group: 1 },
  { id: "igis", name: "Igis", canton: 'GR', group: 1 },
  { id: "landqart", name: "Landquart", canton: 'GR', group: 1 },
  { id: "maladers", name: "Maladers", canton: 'GR', group: 1 },
  { id: "malix", name: "Malix", canton: 'GR', group: 1 },
  { id: "passgg", name: "Passugg", canton: 'GR', group: 1 },
  { id: "praden", name: "Praden", canton: 'GR', group: 1 },
  { id: "reichena", name: "Reichenau", canton: 'GR', group: 1 },
  { id: "rha-z-ns", name: "Rhäzüns", canton: 'GR', group: 1 },
  { id: "tamins", name: "Tamins", canton: 'GR', group: 1 },
  { id: "trimmis", name: "Trimmis", canton: 'GR', group: 1 },
  { id: "trin", name: "Trin", canton: 'GR', group: 1 },
  { id: "trin-digg", name: "Trin Digg", canton: 'GR', group: 1 },
  { id: "trin-mlin", name: "Trin Mulin", canton: 'GR', group: 1 },
  { id: "tschiertschen", name: "Tschiertschen", canton: 'GR', group: 1 },
  { id: "ntervaz", name: "Untervaz", canton: 'GR', group: 1 },
  { id: "zizers", name: "Zizers", canton: 'GR', group: 1 },
  { id: "cazis", name: "Cazis", canton: 'GR', group: 2 },
  { id: "domleschg", name: "Domleschg", canton: 'GR', group: 2 },
  { id: "la-sch", name: "Fläsch", canton: 'GR', group: 2 },
  { id: "lims", name: "Flims", canton: 'GR', group: 2 },
  { id: "gr-sch", name: "Grüsch", canton: 'GR', group: 2 },
  { id: "jenins", name: "Jenins", canton: 'GR', group: 2 },
  { id: "laax", name: "Laax", canton: 'GR', group: 2 },
  { id: "lenzerheide", name: "Lenzerheide", canton: 'GR', group: 2 },
  { id: "maieneld", name: "Maienfeld", canton: 'GR', group: 2 },
  { id: "malans", name: "Malans", canton: 'GR', group: 2 },
  { id: "mastrils", name: "Mastrils", canton: 'GR', group: 2 },
  { id: "parpan", name: "Parpan", canton: 'GR', group: 2 },
  { id: "pratval", name: "Pratval", canton: 'GR', group: 2 },
  { id: "rodels", name: "Rodels", canton: 'GR', group: 2 },
  { id: "rothenbrnnen", name: "Rothenbrunnen", canton: 'GR', group: 2 },
  { id: "says", name: "Says", canton: 'GR', group: 2 },
  { id: "scharans", name: "Scharans", canton: 'GR', group: 2 },
  { id: "sils-im-domleschg", name: "Sils im Domleschg", canton: 'GR', group: 2 },
  { id: "st-peter", name: "St. Peter", canton: 'GR', group: 2 },
  { id: "smmaprada", name: "Summaprada", canton: 'GR', group: 2 },
  { id: "thsis", name: "Thusis", canton: 'GR', group: 2 },
  { id: "valbella", name: "Valbella", canton: 'GR', group: 2 },
];
export function localitiesForMode(mode: ImmoGRGroupMode): ImmoGRLocality[] {
  return IMMOGR_LOCALITIES.filter((item) => mode === 'both' || (mode === 'group1' ? item.group === 1 : item.group === 2));
}
export function isImmoGRGroupMode(value: unknown): value is ImmoGRGroupMode {
  return value === 'group1' || value === 'group2' || value === 'both';
}
