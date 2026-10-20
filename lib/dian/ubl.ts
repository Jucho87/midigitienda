import {
  DianTaxpayerData,
  DianCustomerData,
  DianTaxBreakdown,
} from './types';
import { calculateDV } from './crypto';

// ---------------------------------------------------------------------------
// Generador de XML UBL 2.1 oficial para la DIAN
// Conforme a la Resolución 000042 de 2020 y Resolución 000165 de 2023
// (Factura Electrónica de Venta y Documento Equivalente Electrónico POS)
// ---------------------------------------------------------------------------

export interface UblInvoiceParams {
  documentType: '01' | '20'; // 01 = Factura Electrónica, 20 = Doc Equivalente POS
  fullNumber: string;        // ej. 'POS-101'
  prefix: string;
  consecutive: number;
  cufe: string;
  issueDate: string;         // YYYY-MM-DD
  issueTime: string;         // HH:mm:ss-05:00
  taxpayer: DianTaxpayerData;
  customer: DianCustomerData;
  items: Array<{
    id: string;
    name: string;
    barcode?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number; // 0.19, 0.05, 0.08, 0
    taxType: string; // 'IVA_19', 'IVA_5', 'INC_8', 'IVA_0'
    subtotal: number;
    taxAmount: number;
    total: number;
  }>;
  taxBreakdown: DianTaxBreakdown;
  paymentMethod: string;     // 'CASH', 'CARD', 'TRANSFER'
  currencyCode?: string;     // 'COP', 'USD'
}

export function generateUblXml(params: UblInvoiceParams): string {
  const { taxpayer, customer, items, taxBreakdown } = params;
  const res = taxpayer.resolution;
  const currency = params.currencyCode || 'COP';

  // Código de medio de pago DIAN: 10 = Efectivo, 48 = Tarjeta Crédito, 49 = Tarjeta Débito, 47 = Transferencia
  const paymentMeansCode =
    params.paymentMethod === 'CARD'
      ? '48'
      : params.paymentMethod === 'TRANSFER'
      ? '47'
      : '10';

  const customerDv = customer.dv || calculateDV(customer.idNumber);

  const linesXml = items
    .map((item, index) => {
      const lineNum = index + 1;
      const isInc = item.taxType === 'INC_8';
      const taxSchemeId = isInc ? '04' : '01';
      const taxSchemeName = isInc ? 'INC' : 'IVA';

      return `    <cac:InvoiceLine>
      <cbc:ID>${lineNum}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="EA">${item.quantity.toFixed(2)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${currency}">${item.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${currency}">${item.taxAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${currency}">${item.subtotal.toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${currency}">${item.taxAmount.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:Percent>${(item.taxRate * 100).toFixed(2)}</cbc:Percent>
            <cac:TaxScheme>
              <cbc:ID>${taxSchemeId}</cbc:ID>
              <cbc:Name>${taxSchemeName}</cbc:Name>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Description><![CDATA[${item.name}]]></cbc:Description>
        ${item.barcode ? `<cac:StandardItemIdentification><cbc:ID schemeID="999">${item.barcode}</cbc:ID></cac:StandardItemIdentification>` : ''}
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        <cbc:BaseQuantity unitCode="EA">1.00</cbc:BaseQuantity>
      </cac:Price>
    </cac:InvoiceLine>`;
    })
    .join('\n');

  // Construcción del XML UBL 2.1 estándar de la DIAN
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:dian="dian:gov:co:facturaelectronica:Structures-2-1">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <dian:DianExtensions>
          <dian:InvoiceControl>
            <dian:InvoiceAuthorization>${res.resolutionNumber}</dian:InvoiceAuthorization>
            <dian:AuthorizationPeriod>
              <cbc:StartDate>${res.validFrom}</cbc:StartDate>
              <cbc:EndDate>${res.validTo}</cbc:EndDate>
            </dian:AuthorizationPeriod>
            <dian:AuthorizedInvoices>
              <dian:Prefix>${res.prefix}</dian:Prefix>
              <dian:From>${res.fromNumber}</dian:From>
              <dian:To>${res.toNumber}</dian:To>
            </dian:AuthorizedInvoices>
          </dian:InvoiceControl>
          <dian:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6" listAgencyName="United Nations Economic Commission for Europe" listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1">CO</cbc:IdentificationCode>
          </dian:InvoiceSource>
          <dian:SoftwareProvider>
            <dian:ProviderID schemeID="${taxpayer.dv}" schemeName="31" schemeAgencyID="195">${taxpayer.nit}</dian:ProviderID>
            <dian:SoftwareID schemeAgencyID="195">${res.softwareId || 'MiDigiTienda-Software-Propio'}</dian:SoftwareID>
          </dian:SoftwareProvider>
          <dian:SoftwareSecurityCode schemeAgencyID="195">${params.cufe.slice(0, 64)}</dian:SoftwareSecurityCode>
        </dian:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>${params.documentType}</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ProfileExecutionID>${res.environment}</cbc:ProfileExecutionID>
  <cbc:ID>${params.fullNumber}</cbc:ID>
  <cbc:UUID schemeID="${res.environment}" schemeName="CUFE-SHA384">${params.cufe}</cbc:UUID>
  <cbc:IssueDate>${params.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${params.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${params.documentType === '20' ? '20' : '01'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${items.length}</cbc:LineCountNumeric>

  <!-- Datos del Emisor / Obligado a Facturar -->
  <cac:AccountingSupplierParty>
    <cbc:AdditionalAccountID>${taxpayer.taxRegime === '48' ? '1' : '2'}</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyID="195" schemeID="${taxpayer.dv}" schemeName="31">${taxpayer.nit}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${taxpayer.commercialName || taxpayer.legalName}]]></cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>${taxpayer.cityCode}</cbc:ID>
          <cbc:CityName>${taxpayer.cityName}</cbc:CityName>
          <cbc:CountrySubentity>${taxpayer.departmentName}</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>${taxpayer.departmentCode}</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${taxpayer.address}]]></cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            <cbc:Name languageID="es">Colombia</cbc:Name>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName><![CDATA[${taxpayer.legalName}]]></cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${taxpayer.dv}" schemeName="31">${taxpayer.nit}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">${taxpayer.taxRegime}</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${taxpayer.legalName}]]></cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${taxpayer.dv}" schemeName="31">${taxpayer.nit}</cbc:CompanyID>
        <cac:CorporateRegistrationScheme>
          <cbc:ID>${res.prefix}</cbc:ID>
        </cac:CorporateRegistrationScheme>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${taxpayer.phone}</cbc:Telephone>
        <cbc:ElectronicMail>${taxpayer.email}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Datos del Adquirente / Cliente -->
  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>${customer.idType === '31' ? '1' : '2'}</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyID="195" schemeID="${customerDv}" schemeName="${customer.idType}">${customer.idNumber}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${customer.name}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName><![CDATA[${customer.name}]]></cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${customerDv}" schemeName="${customer.idType}">${customer.idNumber}</cbc:CompanyID>
        <cbc:TaxLevelCode listName="49">R-99-PN</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      ${customer.email ? `<cac:Contact><cbc:ElectronicMail>${customer.email}</cbc:ElectronicMail></cac:Contact>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Forma y Medios de Pago -->
  <cac:PaymentMeans>
    <cbc:ID>1</cbc:ID>
    <cbc:PaymentMeansCode>${paymentMeansCode}</cbc:PaymentMeansCode>
    <cbc:PaymentDueDate>${params.issueDate}</cbc:PaymentDueDate>
  </cac:PaymentMeans>

  <!-- Desglose de Impuestos Globales -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${taxBreakdown.totalTax.toFixed(2)}</cbc:TaxAmount>
    ${
      taxBreakdown.iva19 > 0
        ? `<cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${taxBreakdown.baseIva19.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${taxBreakdown.iva19.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>19.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
        : ''
    }
    ${
      taxBreakdown.iva5 > 0
        ? `<cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${taxBreakdown.baseIva5.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${taxBreakdown.iva5.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>5.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
        : ''
    }
    ${
      taxBreakdown.inc8 > 0
        ? `<cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${taxBreakdown.baseInc8.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${taxBreakdown.inc8.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>8.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>04</cbc:ID>
          <cbc:Name>INC</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
        : ''
    }
  </cac:TaxTotal>

  <!-- Totales Monetarios Legales -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${taxBreakdown.totalBase.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${taxBreakdown.totalBase.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${(taxBreakdown.totalBase + taxBreakdown.totalTax).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${(taxBreakdown.totalBase + taxBreakdown.totalTax).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Líneas de Detalle -->
${linesXml}
</Invoice>`;
}

// ---------------------------------------------------------------------------
// Generador de Nota Crédito Electrónica UBL 2.1 (Para anulación conforme a DIAN)
// ---------------------------------------------------------------------------
export interface UblCreditNoteParams {
  creditNoteNumber: string; // ej. 'NC-101'
  cude: string;
  issueDate: string;
  issueTime: string;
  originalInvoiceNumber: string;
  originalCufe: string;
  taxpayer: DianTaxpayerData;
  customer: DianCustomerData;
  totalAmount: number;
  reason: string;
  currencyCode?: string;
}

export function generateCreditNoteUblXml(params: UblCreditNoteParams): string {
  const currency = params.currencyCode || 'COP';
  return `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>91</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ID>${params.creditNoteNumber}</cbc:ID>
  <cbc:UUID schemeName="CUDE-SHA384">${params.cude}</cbc:UUID>
  <cbc:IssueDate>${params.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${params.issueTime}</cbc:IssueTime>
  <cac:DiscrepancyResponse>
    <cbc:ReferenceID>${params.originalInvoiceNumber}</cbc:ReferenceID>
    <cbc:ResponseCode>2</cbc:ResponseCode>
    <cbc:Description><![CDATA[${params.reason || 'Anulación de factura electrónica / comprobante POS'}]]></cbc:Description>
  </cac:DiscrepancyResponse>
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${params.originalInvoiceNumber}</cbc:ID>
      <cbc:UUID schemeName="CUFE-SHA384">${params.originalCufe}</cbc:UUID>
      <cbc:IssueDate>${params.issueDate}</cbc:IssueDate>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="${currency}">${params.totalAmount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</CreditNote>`;
}
