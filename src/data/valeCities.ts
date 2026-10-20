export const valeCities = [
  'Apiaí',
  'Barra do Chapéu',
  'Barra do Turvo',
  'Cajati',
  'Cananéia',
  'Eldorado',
  'Iguape',
  'Ilha Comprida',
  'Iporanga',
  'Itaóca',
  'Itapirapuã Paulista',
  'Itariri',
  'Jacupiranga',
  'Juquiá',
  'Juquitiba',
  'Miracatu',
  'Pariquera-Açu',
  'Pedro de Toledo',
  'Registro',
  'Ribeira',
  'São Lourenço da Serra',
  'Sete Barras',
  'Tapiraí',
] as const;

export type ValeCity = (typeof valeCities)[number];

export const defaultValeCity: ValeCity = 'Registro';

export function isValeCity(value: unknown): value is ValeCity {
  return typeof value === 'string' && (valeCities as readonly string[]).includes(value);
}
