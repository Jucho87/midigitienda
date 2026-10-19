'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { Order } from '@/types';
import { Can } from '@/components/common/Can';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import {
  ReceiptText,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Send,
  Eye,
  RotateCcw,
  Printer,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { currentTenant, isSubscriptionExpired } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Selected Order for detail & receipt
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const loadOrders = () => {
    const list = db.getOrders(currentTenant.id);
    setOrders(list);
  };

  useEffect(() => {
    loadOrders();
  }, [currentTenant.id]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchMethod = filterMethod === 'all' || o.paymentMethod === filterMethod;
      const matchStatus = filterStatus === 'all' || o.status === filterStatus;
      const matchQuery =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.userName && o.userName.toLowerCase().includes(q)) ||
        (o.paymentReference && o.paymentReference.toLowerCase().includes(q));
      return matchMethod && matchStatus && matchQuery;
    });
  }, [orders, search, filterMethod, filterStatus]);

  // Totals for current filter
  const totalSalesVolume = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0);
  }, [filteredOrders]);

  const totalTransactionsCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === 'completed').length;
  }, [filteredOrders]);

  // Cancel / Refund Order
  const handleCancelOrder = (order: Order) => {
    if (
      confirm(
        `¿Confirmas anular la venta #${order.id.slice(-6).toUpperCase()} por ${currentTenant.currency}${order.total.toFixed(2)}?\nEsta acción revertirá automáticamente las cantidades vendidas al inventario.`
      )
    ) {
      try {
        db.cancelOrder(currentTenant.id, order.id);
        loadOrders();
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(db.getOrderById(currentTenant.id, order.id) || null);
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error al anular la venta');
      }
    }
  };

  const paymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-600" />;
      case 'card_machine':
        return <CreditCard className="w-3.5 h-3.5 text-blue-600" />;
      case 'transfer':
        return <Send className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return null;
    }
  };

  const paymentName = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo';
      case 'card_machine':
        return 'Tarjeta';
      case 'transfer':
        return 'Transferencia';
      default:
        return method;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Title & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Historial de Ventas y Pedidos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico de transacciones realizadas en caja con aislamiento por negocio
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Filtrado</div>
            <div className="text-base font-bold text-slate-900">
              {currentTenant.currency}
              {totalSalesVolume.toFixed(2)}
            </div>
          </div>
          <div className="h-7 w-[1px] bg-slate-200" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Transacciones</div>
            <div className="text-base font-bold text-slate-900">{totalTransactionsCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio, cajero o referencia..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {/* Payment Method filter */}
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700"
          >
            <option value="all">Todos los Métodos</option>
            <option value="cash">Efectivo</option>
            <option value="card_machine">Tarjeta / Terminal</option>
            <option value="transfer">Transferencia</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700"
          >
            <option value="all">Todos los Estados</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Anuladas</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Folio / Fecha</th>
                <th className="py-3.5 px-4">Cajero / Operador</th>
                <th className="py-3.5 px-4">Método de Pago</th>
                <th className="py-3.5 px-4">Artículos</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se han registrado ventas con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isCancelled ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          #{order.id.slice(-6).toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          <span>
                            {new Date(order.createdAt).toLocaleDateString([], {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {order.userName || 'Cajero'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {paymentIcon(order.paymentMethod)}
                          <span>{paymentName(order.paymentMethod)}</span>
                        </span>
                        {order.paymentReference && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Ref: {order.paymentReference}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {order.itemsCount} productos
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold text-sm ${
                            isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {currentTenant.currency}
                          {order.total.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isCancelled
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isCancelled ? (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Anulada</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Completada</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Ver detalle de artículos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print ticket */}
                          <button
                            onClick={() => setReceiptOrder(order)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                            title="Reimprimir Ticket POS"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Anular venta (RBAC protected) */}
                          {!isCancelled && (
                            <Can I="orders.delete">
                              <button
                                onClick={() => handleCancelOrder(order)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Anular venta y reingresar stock"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </Can>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Detalle de Venta #{selectedOrder.id.slice(-6).toUpperCase()}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {new Date(selectedOrder.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-xs px-2.5 py-1 text-slate-500 hover:bg-slate-200 rounded-lg"
              >
                Cerrar
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cajero:</span>
                  <span className="font-semibold text-slate-800">{selectedOrder.userName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Método:</span>
                  <span className="font-semibold text-slate-800">
                    {paymentName(selectedOrder.paymentMethod)}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">Artículos Vendidos:</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedOrder.orderItems?.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs bg-white">
                      <div>
                        <div className="font-semibold text-slate-800">{item.productName}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.quantity} x {currentTenant.currency}
                          {item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900">
                        {currentTenant.currency}
                        {item.subtotal.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-slate-100/70 p-3 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between font-bold text-sm text-slate-900">
                  <span>Total Transacción:</span>
                  <span style={{ color: currentTenant.primaryColor }}>
                    {currentTenant.currency}
                    {selectedOrder.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  setReceiptOrder(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                style={{ backgroundColor: currentTenant.primaryColor }}
              >
                Imprimir Comprobante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          tenant={currentTenant}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};
