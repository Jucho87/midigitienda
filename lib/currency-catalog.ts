// Catálogo de monedas de uso común para preconfigurar negocios.

export interface CurrencyPreset {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCY_PRESETS: CurrencyPreset[] = [
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano' },
  { code: 'GBP', symbol: '£', name: 'Libra Esterlina' },
];

export function symbolForCode(code: string): string {
  const found = CURRENCY_PRESETS.find((c) => c.code === code);
  return found ? found.symbol : code;
}

export function nameForCode(code: string): string {
  const found = CURRENCY_PRESETS.find((c) => c.code === code);
  return found ? found.name : code;
}
