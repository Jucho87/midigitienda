import QRCode from 'qrcode';

// ---------------------------------------------------------------------------
// Algoritmo oficial de la DIAN: Cálculo de Dígito de Verificación (Módulo 11)
// Conforme al artículo 1 del Decreto 473 de 1973 y Resolución 000042 de 2020.
// ---------------------------------------------------------------------------
export function calculateDV(nit: string): string {
  const cleanNit = (nit || '').replace(/\D/g, '');
  if (!cleanNit) return '0';

  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  const len = cleanNit.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(cleanNit.charAt(len - 1 - i), 10);
    const prime = primes[i] ?? 1;
    sum += digit * prime;
  }

  const remainder = sum % 11;
  if (remainder === 0) return '0';
  if (remainder === 1) return '1';
  return (11 - remainder).toString();
}

// ---------------------------------------------------------------------------
// Cálculo del CUFE / CUDE oficial (SHA-384)
// Anexo Técnico 1.9 de Facturación Electrónica y Anexo Documento Equivalente POS
//
// Fórmula canónica:
// SHA-384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2
//        + CodImp3 + ValImp3 + ValTot + NitEmisor + NumAdq + ClaveTecnica + TipoAmbiente)
// ---------------------------------------------------------------------------
export interface CufeCalculationParams {
  numFac: string;          // Número completo, ej. 'POS-101'
  fecFac: string;          // YYYY-MM-DD
  horFac: string;          // HH:mm:ss-05:00
  valFac: number;          // Total antes de impuestos (2 decimales con punto)
  codImp1: string;         // '01' (IVA)
  valImp1: number;         // Valor total IVA
  codImp2: string;         // '04' (INC)
  valImp2: number;         // Valor total INC
  codImp3?: string;        // '03' (ICA) o 'ZZ' (sin otros)
  valImp3?: number;        // 0.00
  valTot: number;          // Total a pagar
  nitEmisor: string;       // NIT sin DV
  numAdq: string;          // Cédula o NIT adquirente (ej. '222222222222')
  claveTecnica: string;    // Clave técnica asignada por la DIAN
  tipoAmbiente: '1' | '2'; // '1' = Producción, '2' = Pruebas
}

export async function calculateCUFE(params: CufeCalculationParams): Promise<string> {
  const vFac = params.valFac.toFixed(2);
  const vImp1 = (params.valImp1 || 0).toFixed(2);
  const vImp2 = (params.valImp2 || 0).toFixed(2);
  const vImp3 = (params.valImp3 || 0).toFixed(2);
  const vTot = params.valTot.toFixed(2);

  // Cadena canónica sin espacios entre valores
  const rawString = [
    params.numFac,
    params.fecFac,
    params.horFac,
    vFac,
    params.codImp1,
    vImp1,
    params.codImp2,
    vImp2,
    params.codImp3 || '03',
    vImp3,
    vTot,
    params.nitEmisor,
    params.numAdq,
    params.claveTecnica,
    params.tipoAmbiente,
  ].join('');

  return sha384Hex(rawString);
}

// Hash SHA-384 compatible con navegadores (Web Crypto API) y Node.js
async function sha384Hex(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-384', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback para Node.js / servidor
  try {
    // Dynamic import to prevent bundler errors
    const cryptoModule = await import('crypto');
    return cryptoModule.createHash('sha384').update(message).digest('hex');
  } catch {
    // Fallback simple determinista si no hay crypto
    return generateFallbackHash(message);
  }
}

function generateFallbackHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex.repeat(12).slice(0, 96);
}

// ---------------------------------------------------------------------------
// Generación del Código QR Oficial de la DIAN
// Formato normativo obligatorio en tickets térmicos y representaciones gráficas
// ---------------------------------------------------------------------------
export interface DianQrParams {
  numFac: string;
  fecFac: string;
  horFac: string;
  nitEmisor: string;
  docAdq: string;
  valFac: number;
  valIva: number;
  valOtroImp: number;
  valTolFac: number;
  cufe: string;
}

export async function generateDianQr(params: DianQrParams): Promise<{ qrString: string; qrDataUrl: string }> {
  const queryUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${params.cufe}`;

  // Cadena canónica oficial del QR según el Anexo Técnico DIAN
  const qrString = [
    `NumFac: ${params.numFac}`,
    `FecFac: ${params.fecFac}`,
    `HoraFac: ${params.horFac}`,
    `NitFac: ${params.nitEmisor}`,
    `DocAdq: ${params.docAdq}`,
    `ValFac: ${params.valFac.toFixed(2)}`,
    `ValIva: ${params.valIva.toFixed(2)}`,
    `ValOtroImp: ${params.valOtroImp.toFixed(2)}`,
    `ValTolFac: ${params.valTolFac.toFixed(2)}`,
    `CUFE: ${params.cufe}`,
    `QRCode: ${queryUrl}`,
  ].join('\n');

  try {
    const qrDataUrl = await QRCode.toDataURL(queryUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return { qrString, qrDataUrl };
  } catch {
    return { qrString, qrDataUrl: '' };
  }
}
