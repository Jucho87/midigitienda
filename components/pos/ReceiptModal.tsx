'use client';

import React, { useState } from 'react';
import { Order, Tenant } from '@/types';
import { Printer, CheckCircle, X, Download, QrCode, FileCode, Copy, Check } from 'lucide-react';

interface ReceiptModalProps {
  order: Order;
  tenant: Tenant;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, tenant, onClose }) => {
  const [copiedCufe, setCopiedCufe] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const paymentLabels: Record<string, string> = {
    cash: 'Efectivo',
    card_machine: 'Tarjeta (Terminal POS)',
    transfer: 'Transferencia Bancaria',
  };

  const dianConfig = tenant.dianConfig;
  const resolution = dianConfig?.resolution;
  const isDianDoc = Boolean(order.dianDocumentNumber || order.dianCufe);

  const handleDownloadXml = () => {
    if (!order.dianXml) return;
    const blob = new Blob([order.dianXml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.dianDocumentNumber || 'documento-dian'}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCufe = () => {
    if (!order.dianCufe) return;
    navigator.clipboard.writeText(order.dianCufe);
    setCopiedCufe(true);
    setTimeout(() => setCopiedCufe(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {isDianDoc ? 'Documento Equivalente Electrónico POS' : 'Comprobante de Venta Emitido'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isDianDoc ? 'Validado con Software Propio conforme a la DIAN' : 'Registro de caja POS'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="p-5 bg-slate-100 flex justify-center max-h-[72vh] overflow-y-auto">
          <div
            id="thermal-receipt"
            className="bg-white p-5 rounded-lg shadow-sm w-full max-w-[340px] font-mono text-xs text-slate-800 border border-slate-200"
          >
            {/* Business Logo/Header */}
            <div className="text-center pb-2.5 border-b border-dashed border-slate-300">
              <div
                className="w-8 h-8 mx-auto rounded-full text-white flex items-center justify-center font-bold text-xs mb-1"
                style={{ backgroundColor: tenant.primaryColor || '#10B981' }}
              >
                {(dianConfig?.commercialName || tenant.name).substring(0, 2).toUpperCase()}
              </div>
              <h2 className="font-bold text-sm text-slate-900 leading-tight">
                {dianConfig?.legalName || tenant.name}
              </h2>
              {dianConfig?.commercialName && dianConfig.commercialName !== dianConfig.legalName && (
                <p className="text-[10px] text-slate-600 font-semibold">{dianConfig.commercialName}</p>
              )}
              {dianConfig?.nit ? (
                <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                  NIT: {dianConfig.nit}-{dianConfig.dv || '0'}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">Comercio: {tenant.slug}</p>
              )}
              {dianConfig?.taxRegime && (
                <p className="text-[10px] text-slate-500">
                  {dianConfig.taxRegime === '48' ? 'Responsable de IVA' : 'No Responsable de IVA'}
                </p>
              )}
              {dianConfig?.address && (
                <p className="text-[10px] text-slate-500 leading-tight">
                  {dianConfig.address} - {dianConfig.cityName || 'Colombia'}
                </p>
              )}
              {dianConfig?.phone && (
                <p className="text-[10px] text-slate-500">Tel: {dianConfig.phone}</p>
              )}
            </div>

            {/* Resolución DIAN (Obligatorio en Colombia) */}
            {resolution && (
              <div className="py-2 border-b border-dashed border-slate-300 text-[10px] text-slate-600 text-center space-y-0.5 bg-slate-50/70 p-1.5 rounded-sm my-1">
                <div className="font-semibold text-slate-800">
                  DOCUMENTO EQUIVALENTE ELECTRÓNICO POS
                </div>
                <div>
                  No. de Autorización DIAN: <span className="font-bold">{resolution.resolutionNumber}</span>
                </div>
                <div>
                  Prefijo: <span className="font-bold">{order.dianPrefix || resolution.prefix}</span> del {resolution.fromNumber} al {resolution.toNumber}
                </div>
                <div>
                  Vigencia: {resolution.validFrom} al {resolution.validTo}
                </div>
              </div>
            )}

            {/* Ticket Metadata */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Número:</span>
                <span className="font-bold text-slate-900">
                  {order.dianDocumentNumber || `#${order.id.slice(-6).toUpperCase()}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span>{new Date(order.createdAt).toLocaleDateString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hora:</span>
                <span>
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cajero:</span>
                <span className="truncate max-w-[130px]">{order.userName || 'Cajero'}</span>
              </div>

              {/* Adquirente / Cliente */}
              <div className="pt-1 mt-1 border-t border-slate-100 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Adquirente:</span>
                  <span className="font-semibold truncate max-w-[170px]">
                    {order.dianCustomer?.name || 'Consumidor Final'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Identificación:</span>
                  <span>{order.dianCustomer?.idNumber || '222222222222'}</span>
                </div>
                {order.dianCustomer?.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="truncate max-w-[170px]">{order.dianCustomer.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 mb-1">
                <span>Cant / Descripción</span>
                <span>Subtotal</span>
              </div>

              <div className="space-y-1.5">
                {order.orderItems?.map((item) => (
                  <div key={item.id} className="text-[11px]">
                    <div className="font-medium text-slate-900 truncate">{item.productName}</div>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {item.quantity} x {tenant.currency}
                        {item.unitPrice.toFixed(2)}
                        {item.dianTaxType ? ` (${item.dianTaxType})` : ''}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {tenant.currency}
                        {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Impuestos Discriminados */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Base Gravable):</span>
                <span>
                  {tenant.currency}
                  {order.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Desglose oficial de impuestos colombianos */}
              {order.dianTaxBreakdown ? (
                <>
                  {order.dianTaxBreakdown.iva19 > 0 && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>IVA 19% (Base {tenant.currency}{order.dianTaxBreakdown.baseIva19.toFixed(2)}):</span>
                      <span>{tenant.currency}{order.dianTaxBreakdown.iva19.toFixed(2)}</span>
                    </div>
                  )}
                  {order.dianTaxBreakdown.iva5 > 0 && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>IVA 5% (Base {tenant.currency}{order.dianTaxBreakdown.baseIva5.toFixed(2)}):</span>
                      <span>{tenant.currency}{order.dianTaxBreakdown.iva5.toFixed(2)}</span>
                    </div>
                  )}
                  {order.dianTaxBreakdown.inc8 > 0 && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>INC 8% Consumo (Base {tenant.currency}{order.dianTaxBreakdown.baseInc8.toFixed(2)}):</span>
                      <span>{tenant.currency}{order.dianTaxBreakdown.inc8.toFixed(2)}</span>
                    </div>
                  )}
                  {order.dianTaxBreakdown.baseExempt > 0 && (
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Bienes Exentos / Excluidos:</span>
                      <span>{tenant.currency}{order.dianTaxBreakdown.baseExempt.toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : (
                order.tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Impuestos:</span>
                    <span>
                      {tenant.currency}
                      {order.tax.toFixed(2)}
                    </span>
                  </div>
                )
              )}

              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                <span>TOTAL A PAGAR:</span>
                <span style={{ color: tenant.primaryColor || '#10B981' }}>
                  {tenant.currency}
                  {order.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5 text-slate-600">
              <div className="flex justify-between">
                <span>Medio de Pago:</span>
                <span className="font-semibold text-slate-800">
                  {paymentLabels[order.paymentMethod] || order.paymentMethod}
                </span>
              </div>

              {order.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Recibido:</span>
                    <span>
                      {tenant.currency}
                      {(order.amountReceived || order.total).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Cambio:</span>
                    <span className="text-emerald-600">
                      {tenant.currency}
                      {(order.changeGiven || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {order.paymentReference && (
                <div className="flex justify-between">
                  <span>Ref / Autorización:</span>
                  <span className="font-mono">{order.paymentReference}</span>
                </div>
              )}
            </div>

            {/* Código QR Oficial DIAN */}
            {order.dianQrDataUrl ? (
              <div className="pt-3 pb-1 text-center">
                <img
                  src={order.dianQrDataUrl}
                  alt="QR DIAN"
                  className="w-28 h-28 mx-auto border border-slate-200 p-1 rounded-sm bg-white"
                />
                <p className="text-[9px] text-slate-400 mt-1">Escanee para verificar en catálogo DIAN</p>
              </div>
            ) : null}

            {/* CUFE / CUDE Oficial */}
            {order.dianCufe && (
              <div className="pt-2 text-[9px] text-slate-500 break-all leading-tight">
                <div className="flex items-center justify-between font-bold text-slate-700 mb-0.5">
                  <span>CUFE / CUDE:</span>
                  <button
                    onClick={handleCopyCufe}
                    className="text-[9px] text-emerald-700 hover:underline flex items-center space-x-0.5 font-normal"
                  >
                    {copiedCufe ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCufe ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200 font-mono text-[8.5px]">
                  {order.dianCufe}
                </div>
              </div>
            )}

            {/* Legal Footnote */}
            <div className="pt-3 text-center space-y-1">
              <div className="text-[9px] text-slate-500 leading-tight">
                Documento Equivalente Electrónico POS emitido conforme a la Resolución DIAN 000165 de 2023.
              </div>
              <div className="text-[8.5px] text-slate-400">
                Software Propio: MiDigiTienda POS v2.0
              </div>
              <div className="text-[10px] text-slate-600 font-medium pt-1">
                ¡Gracias por su compra!
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
          {order.dianXml ? (
            <button
              onClick={handleDownloadXml}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Descargar archivo XML bajo estándar UBL 2.1 exigido por la DIAN"
            >
              <FileCode className="w-4 h-4 text-emerald-600" />
              <span>Descargar XML UBL 2.1</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm hover:opacity-95 transition-opacity"
              style={{ backgroundColor: tenant.primaryColor || '#10B981' }}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket (80mm)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
