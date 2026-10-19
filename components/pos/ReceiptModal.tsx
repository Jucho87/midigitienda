'use client';

import React from 'react';
import { Order, Tenant } from '@/types';
import { Printer, CheckCircle, X, Download } from 'lucide-react';

interface ReceiptModalProps {
  order: Order;
  tenant: Tenant;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, tenant, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const paymentLabels: Record<string, string> = {
    cash: 'Efectivo',
    card_machine: 'Tarjeta (Terminal POS)',
    transfer: 'Transferencia Bancaria',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Comprobante de Venta Emitido</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="p-6 bg-slate-100 flex justify-center max-h-[70vh] overflow-y-auto">
          <div
            id="thermal-receipt"
            className="bg-white p-5 rounded-lg shadow-sm w-full max-w-[320px] font-mono text-xs text-slate-800 border border-slate-200"
          >
            {/* Business Logo/Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div
                className="w-8 h-8 mx-auto rounded-full text-white flex items-center justify-center font-bold text-xs mb-1"
                style={{ backgroundColor: tenant.primaryColor }}
              >
                {tenant.name.substring(0, 2).toUpperCase()}
              </div>
              <h2 className="font-bold text-sm text-slate-900 leading-tight">{tenant.name}</h2>
              <p className="text-[10px] text-slate-500">SaaS Multi-Tenant ERP</p>
              <p className="text-[10px] text-slate-500">Comercio: {tenant.slug}</p>
            </div>

            {/* Ticket Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Folio:</span>
                <span className="font-bold">#{order.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span>{new Date(order.createdAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hora:</span>
                <span>
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Atendido por:</span>
                <span className="truncate max-w-[130px]">{order.userName || 'Cajero'}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 mb-1">
                <span>Cant / Prod</span>
                <span>P.U. / Imp</span>
              </div>

              <div className="space-y-1.5">
                {order.orderItems?.map((item) => (
                  <div key={item.id} className="text-[11px]">
                    <div className="font-medium text-slate-900 truncate">{item.productName}</div>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {item.quantity} x {tenant.currency}
                        {item.unitPrice.toFixed(2)}
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

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>
                  {tenant.currency}
                  {order.subtotal.toFixed(2)}
                </span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Impuestos (IVA):</span>
                  <span>
                    {tenant.currency}
                    {order.tax.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span style={{ color: tenant.primaryColor }}>
                  {tenant.currency}
                  {order.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Método de Pago:</span>
                <span className="font-semibold text-slate-800">
                  {paymentLabels[order.paymentMethod] || order.paymentMethod}
                </span>
              </div>

              {order.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Monto Recibido:</span>
                    <span>
                      {tenant.currency}
                      {(order.amountReceived || order.total).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Cambio Devuelto:</span>
                    <span className="text-emerald-600">
                      {tenant.currency}
                      {(order.changeGiven || 0).toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {order.paymentReference && (
                <div className="flex justify-between">
                  <span>Referencia / Aut:</span>
                  <span className="font-mono">{order.paymentReference}</span>
                </div>
              )}
            </div>

            {/* Barcode & Footer */}
            <div className="pt-4 text-center space-y-2">
              <div className="h-9 flex items-center justify-center space-x-0.5">
                {[4, 2, 5, 2, 6, 3, 2, 5, 2, 4, 3, 6, 2, 4, 2, 5, 3].map((height, i) => (
                  <div
                    key={i}
                    className="bg-slate-800 w-[2px]"
                    style={{ height: `${height * 4}px` }}
                  />
                ))}
              </div>
              <div className="text-[9px] text-slate-400 font-mono tracking-widest">{order.id}</div>
              <div className="text-[10px] text-slate-500 font-medium">
                ¡Gracias por su preferencia!
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end space-x-3 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Nueva Venta
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm hover:opacity-95 transition-opacity"
            style={{ backgroundColor: tenant.primaryColor }}
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
