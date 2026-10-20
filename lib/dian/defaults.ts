import { DianTaxpayerData, DianTaxRateInfo } from './types';
import { calculateDV } from './crypto';

export const COLOMBIAN_TAX_RATES: DianTaxRateInfo[] = [
  { type: 'IVA_19', name: 'IVA General (19%)', rate: 0.19, code: '01' },
  { type: 'IVA_5', name: 'IVA Reducido (5%)', rate: 0.05, code: '01' },
  { type: 'INC_8', name: 'Impuesto al Consumo INC (8%)', rate: 0.08, code: '04' },
  { type: 'IVA_0', name: 'Exento / Excluido (0%)', rate: 0.0, code: '01' },
];

export const COLOMBIAN_ID_TYPES = [
  { code: '13', label: 'Cédula de Ciudadanía (CC)' },
  { code: '31', label: 'NIT (Número de Identificación Tributaria)' },
  { code: '22', label: 'Cédula de Extranjería (CE)' },
  { code: '41', label: 'Pasaporte' },
  { code: '42', label: 'Documento Extranjero' },
];

export const COLOMBIAN_CITIES = [
  { cityCode: '11001', cityName: 'Bogotá D.C.', departmentCode: '11', departmentName: 'Bogotá D.C.' },
  { cityCode: '05001', cityName: 'Medellín', departmentCode: '05', departmentName: 'Antioquia' },
  { cityCode: '76001', cityName: 'Cali', departmentCode: '76', departmentName: 'Valle del Cauca' },
  { cityCode: '08001', cityName: 'Barranquilla', departmentCode: '08', departmentName: 'Atlántico' },
  { cityCode: '13001', cityName: 'Cartagena de Indias', departmentCode: '13', departmentName: 'Bolívar' },
  { cityCode: '68001', cityName: 'Bucaramanga', departmentCode: '68', departmentName: 'Santander' },
  { cityCode: '66001', cityName: 'Pereira', departmentCode: '66', departmentName: 'Risaralda' },
  { cityCode: '17001', cityName: 'Manizales', departmentCode: '17', departmentName: 'Caldas' },
  { cityCode: '54001', cityName: 'Cúcuta', departmentCode: '54', departmentName: 'Norte de Santander' },
  { cityCode: '73001', cityName: 'Ibagué', departmentCode: '73', departmentName: 'Tolima' },
  { cityCode: '41001', cityName: 'Neiva', departmentCode: '41', departmentName: 'Huila' },
  { cityCode: '50001', cityName: 'Villavicencio', departmentCode: '50', departmentName: 'Meta' },
  { cityCode: '52001', cityName: 'Pasto', departmentCode: '52', departmentName: 'Nariño' },
  { cityCode: '47001', cityName: 'Santa Marta', departmentCode: '47', departmentName: 'Magdalena' },
];

export function getDefaultDianConfig(businessName = 'Mi Negocio Colombia'): DianTaxpayerData {
  const nit = '901584732';
  const dv = calculateDV(nit);

  return {
    enabled: true,
    nit,
    dv,
    legalName: businessName,
    commercialName: businessName,
    taxRegime: '48', // Responsable de IVA
    taxResponsibilities: ['R-99-PN'],
    ciiu: '4711', // Comercio al por menor en establecimientos no especializados
    departmentCode: '11',
    departmentName: 'Bogotá D.C.',
    cityCode: '11001',
    cityName: 'Bogotá D.C.',
    address: 'Carrera 7 # 71 - 21',
    phone: '+57 (601) 745-8899',
    email: 'facturacion@minegocio.com.co',
    resolution: {
      resolutionNumber: '18764000001',
      resolutionDate: '2026-01-15',
      prefix: 'POS',
      fromNumber: 1,
      toNumber: 10000,
      currentNumber: 101,
      validFrom: '2026-01-15',
      validTo: '2027-01-15',
      technicalKey: 'fc8eac422eba16e122d5aa92739577c20ce64a06',
      environment: '2', // Modo Habilitación / Pruebas por defecto
      softwareId: 'e28bbd91-768a-4933-a3b0-449a03761ec8',
      softwarePin: '75489',
    },
  };
}
