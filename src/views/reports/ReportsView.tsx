import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  CreditCard,
  Send,
  Coins,
  Award,
  AlertCircle,
  BarChart,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { currentTenant, hasPermission } = useAuth();

  if (!hasPermission('reports.read')) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-base">Acceso Restringido (403 Forbidden)</h3>
        <p className="text-xs text-slate-500 mt-1">
          Tu rol actual no dispone del permiso <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">reports.read</code> para consultar métricas financieras y balances comerciales.
        </p>
      </div>
    );
  }

  const orders = db.getOrders(currentTenant.id);
  const products = db.getProducts(currentTenant.id);

  const completedOrders = useMemo(() => orders.filter((o) => o.status === 'completed'), [orders]);

  // Financial calculations
  const totalRevenue = useMemo(
    () => completedOrders.reduce((sum, o) => sum + o.total, 0),
    [completedOrders]
  );

  const totalCost = useMemo(() => {
    let costSum = 0;
    completedOrders.forEach((order) => {
      order.orderItems?.forEach((item) => {
        costSum += (item.cost || 0) * item.quantity;
      });
    });
    return costSum;
  }, [completedOrders]);

  const grossProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const averageTicket =
    completedOrders.length > 0 ? (totalRevenue / completedOrders.length).toFixed(2) : '0.00';

  // Payment Breakdown
  const paymentStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      card_machine: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
    };

    completedOrders.forEach((o) => {
      if (stats[o.paymentMethod]) {
        stats[o.paymentMethod].count += 1;
        stats[o.paymentMethod].total += o.total;
      }
    });

    return stats;
  }, [completedOrders]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();

    completedOrders.forEach((o) => {
      o.orderItems?.forEach((item) => {
        const curr = map.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
        curr.quantity += item.quantity;
        curr.revenue += item.subtotal;
        map.set(item.productId, curr);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [completedOrders]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Métricas y Reportes Financieros</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Resumen consolidado de ingresos, costos, rentabilidad y ventas por canal
        </p>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Ingresos Totales (Ventas)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {currentTenant.currency}
            {totalRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {completedOrders.length} transacciones completadas
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Ganancia Bruta Real</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {currentTenant.currency}
            {grossProfit.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Costo deducido: {currentTenant.currency}
            {totalCost.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Margen Promedio</span>
            <Percent className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">+{profitMargin}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Retorno sobre ventas brutas</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Ticket Promedio</span>
            <ShoppingBag className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {currentTenant.currency}
            {averageTicket}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Gasto medio por cliente</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">Distribución por Método de Cobro</h3>

          <div className="space-y-4">
            {/* Efectivo */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>Efectivo en Caja ({paymentStats.cash.count} ventas)</span>
                </span>
                <span className="font-bold text-slate-900">
                  {currentTenant.currency}
                  {paymentStats.cash.total.toFixed(2)} (
                  {totalRevenue > 0
                    ? ((paymentStats.cash.total / totalRevenue) * 100).toFixed(0)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      totalRevenue > 0 ? (paymentStats.cash.total / totalRevenue) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Tarjeta */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Terminal Tarjeta ({paymentStats.card_machine.count} ventas)</span>
                </span>
                <span className="font-bold text-slate-900">
                  {currentTenant.currency}
                  {paymentStats.card_machine.total.toFixed(2)} (
                  {totalRevenue > 0
                    ? ((paymentStats.card_machine.total / totalRevenue) * 100).toFixed(0)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      totalRevenue > 0
                        ? (paymentStats.card_machine.total / totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Transferencia */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Send className="w-4 h-4 text-indigo-600" />
                  <span>Transferencia Bancaria ({paymentStats.transfer.count} ventas)</span>
                </span>
                <span className="font-bold text-slate-900">
                  {currentTenant.currency}
                  {paymentStats.transfer.total.toFixed(2)} (
                  {totalRevenue > 0
                    ? ((paymentStats.transfer.total / totalRevenue) * 100).toFixed(0)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      totalRevenue > 0 ? (paymentStats.transfer.total / totalRevenue) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Best Sellers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Top 5 Productos Más Vendidos</h3>
            <Award className="w-4 h-4 text-amber-500" />
          </div>

          <div className="divide-y divide-slate-100">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Aún no hay suficientes ventas para generar el ranking
              </div>
            ) : (
              topProducts.map((p, index) => (
                <div key={p.name} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 truncate">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800'
                          : index === 1
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">
                      {currentTenant.currency}
                      {p.revenue.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">{p.quantity} unidades vendidas</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
