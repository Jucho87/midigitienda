// Definiciones de tipos para el módulo de Facturación Electrónica y
// Documento Equivalente POS bajo modalidad Software Propio (DIAN Colombia).

export type DianTaxType = 'IVA_19' | 'IVA_5' | 'IVA_0' | 'INC_8';

export interface DianTaxRateInfo {
  type: DianTaxType;
  name: string;
  rate: number; // Porcentaje, ej: 19, 5, 0, 8
  code: string; // '01' para IVA, '04' para INC
}

export type DianIdType = '13' | '31' | '22' | '41' | '42'; // CC, NIT, CE, Pasaporte, Doc Extranjero

export interface DianResolution {
  resolutionNumber: string; // Formulario DIAN 1876, ej: '18764000001'
  resolutionDate: string;   // Fecha de expedición (YYYY-MM-DD)
  prefix: string;           // Prefijo autorizado, ej: 'POS' o 'FE'
  fromNumber: number;       // Número inicial autorizado
  toNumber: number;         // Número final autorizado
  currentNumber: number;    // Consecutivo actual en uso
  validFrom: string;        // Inicio de vigencia
  validTo: string;          // Fin de vigencia
  technicalKey: string;     // Clave técnica provista por la DIAN en Muisca
  environment: '1' | '2';   // '1' = Producción, '2' = Habilitación / Pruebas
  softwareId: string;       // Identificador del software asignado por la DIAN
  softwarePin: string;      // PIN de 5 dígitos del software
}

export interface DianTaxpayerData {
  enabled: boolean;          // Activar/desactivar modo DIAN
  nit: string;               // NIT sin dígito de verificación
  dv: string;                // Dígito de verificación (0-9)
  legalName: string;         // Razón social inscrita en el RUT
  commercialName: string;    // Nombre comercial del establecimiento
  taxRegime: '48' | '49';    // 48 = Responsable de IVA, 49 = No responsable
  taxResponsibilities: string[]; // ['R-99-PN', 'O-13', 'O-15', 'O-23', 'O-47']
  ciiu: string;              // Código de actividad económica principal
  departmentCode: string;    // Código DANE departamento (ej. '11' para Bogotá)
  departmentName: string;    // Nombre departamento
  cityCode: string;          // Código DANE municipio de 5 dígitos (ej. '11001')
  cityName: string;          // Nombre municipio / ciudad
  address: string;           // Dirección fiscal
  phone: string;             // Teléfono de contacto
  email: string;             // Correo para recepción y entrega de facturación
  resolution: DianResolution;
}

export interface DianCustomerData {
  idType: DianIdType;
  idNumber: string;
  dv?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  isFinalConsumer: boolean; // true si es Consumidor Final (222222222222)
}

export interface DianTaxBreakdown {
  baseIva19: number;
  iva19: number;
  baseIva5: number;
  iva5: number;
  baseInc8: number;
  inc8: number;
  baseExempt: number;
  totalTax: number;
  totalBase: number;
}

export interface DianDocumentMeta {
  documentType: '01' | '20' | '91'; // 01 = Factura Venta, 20 = Doc Equivalente POS, 91 = Nota Crédito
  fullNumber: string;               // ej. 'POS-101' o 'NC-101'
  prefix: string;
  consecutive: number;
  cufe: string;                     // Hash SHA-384 oficial
  qrString: string;                 // Cadena canónica del QR
  qrDataUrl: string;                // Imagen base64 PNG para impresión térmica
  xmlUblContent: string;            // XML estándar UBL 2.1
  issueDate: string;                // YYYY-MM-DD
  issueTime: string;                // HH:mm:ss-05:00
  environment: '1' | '2';
  status: 'VALIDATED_LOCAL' | 'TRANSMITTED_DIAN';
}
