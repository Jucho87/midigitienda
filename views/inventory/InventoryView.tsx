'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { Product } from '@/types';
import { Can } from '@/components/common/Can';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  TrendingUp,
  Layers,
  X,
  CheckCircle,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { currentTenant, isSubscriptionExpired } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Reabastecimiento');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 5,
    category: 'General',
  });

  const loadProducts = () => {
    const list = db.getProducts(currentTenant.id);
    setProducts(list);
  };

  useEffect(() => {
    loadProducts();
  }, [currentTenant.id]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'low'
          ? p.stock > 0 && p.stock <= (p.minStock || 5)
          : p.stock <= 0;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchCat && matchStock && matchQuery;
    });
  }, [products, search, categoryFilter, stockFilter]);

  // Inventory Metrics
  const totalCostValue = useMemo(
    () => products.reduce((sum, p) => sum + p.cost * p.stock, 0),
    [products]
  );
  const totalRetailValue = useMemo(
    () => products.reduce((sum, p) => sum + p.price * p.stock, 0),
    [products]
  );
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= (p.minStock || 5)).length,
    [products]
  );
  const outOfStockCount = useMemo(() => products.filter((p) => p.stock <= 0).length, [products]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '',
      price: 0,
      cost: 0,
      stock: 10,
      minStock: 5,
      category: 'General',
    });
    setShowProductModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      barcode: p.barcode || '',
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      minStock: p.minStock || 5,
      category: p.category || 'General',
    });
    setShowProductModal(true);
  };

  // Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingProduct) {
        db.updateProduct(currentTenant.id, editingProduct.id, {
          name: formData.name,
          barcode: formData.barcode.trim() || undefined,
          price: Number(formData.price),
          cost: Number(formData.cost),
          stock: Number(formData.stock),
          minStock: Number(formData.minStock),
          category: formData.category,
        });
      } else {
        db.createProduct(currentTenant.id, {
          name: formData.name,
          barcode: formData.barcode.trim() || undefined,
          price: Number(formData.price),
          cost: Number(formData.cost),
          stock: Number(formData.stock),
          minStock: Number(formData.minStock),
          category: formData.category,
          isActive: true,
        });
      }
      setShowProductModal(false);
      loadProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar el producto');
    }
  };

  // Delete product
  const handleDeleteProduct = (p: Product) => {
    if (confirm(`¿Estás seguro de eliminar el producto "${p.name}" del catálogo?`)) {
      db.deleteProduct(currentTenant.id, p.id);
      loadProducts();
    }
  };

  // Open Adjust Modal
  const handleOpenAdjust = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustAmount(0);
    setAdjustReason('Reabastecimiento de Proveedor');
    setShowAdjustModal(true);
  };

  const handleApplyAdjustment = () => {
    if (!adjustingProduct) return;
    try {
      db.adjustProductStock(currentTenant.id, adjustingProduct.id, adjustAmount, adjustReason);
      setShowAdjustModal(false);
      loadProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al ajustar el inventario');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner & KPI Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Catálogo e Inventario de Productos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión centralizada de stock, costos, precios de venta y márgenes de ganancia
          </p>
        </div>

        <Can I="products.create">
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity self-start"
            style={{ backgroundColor: currentTenant.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </Can>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Catálogo</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{products.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Artículos registrados</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Valor al Costo</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {currentTenant.currency}
            {totalCostValue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Inversión actual en almacén</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Valor Proyectado (Venta)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {currentTenant.currency}
            {totalRetailValue.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">
            Ganancia potencial: {currentTenant.currency}
            {(totalRetailValue - totalCostValue).toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Alertas de Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {lowStockCount + outOfStockCount}
          </div>
          <div className="text-[11px] text-amber-600 mt-1">
            {lowStockCount} por agotarse • {outOfStockCount} sin stock
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
            placeholder="Buscar por nombre o código..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {/* Category Select */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'Todas las Categorías' : c}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                stockFilter === 'low' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Stock Bajo ({lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                stockFilter === 'out' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Agotados ({outOfStockCount})
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Código / Producto</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Costo</th>
                <th className="py-3.5 px-4">Precio Venta</th>
                <th className="py-3.5 px-4">Margen Bruto</th>
                <th className="py-3.5 px-4 text-center">Stock</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron productos registrados en este filtro.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const marginPct = p.price > 0 ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : '0';
                  const isLow = p.stock > 0 && p.stock <= (p.minStock || 5);
                  const isOut = p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                        {p.barcode && (
                          <div className="font-mono text-[11px] text-slate-400">{p.barcode}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                          {p.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {currentTenant.currency}
                        {p.cost.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {currentTenant.currency}
                        {p.price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            Number(marginPct) >= 40
                              ? 'text-emerald-600'
                              : Number(marginPct) > 15
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`}
                        >
                          +{marginPct}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.stock} unid.
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Stock adjustment button */}
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Ajustar Stock"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>

                          <Can I="products.update">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Editar Producto"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </Can>

                          <Can I="products.delete">
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Eliminar Producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Can>
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

      {/* CREATE / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Pan Baguette Artesanal"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Código de Barras (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="7501000101"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Categoría</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Panadería, Bebidas..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Costo Unitario ({currentTenant.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Precio de Venta ({currentTenant.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Stock Inicial (Unidades)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Alerta de Stock Mínimo
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 5 })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Ajuste Rápido de Stock</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-800">{adjustingProduct.name}</div>
                <div className="text-slate-500 mt-0.5">
                  Stock actual en sistema:{' '}
                  <span className="font-bold text-slate-900">{adjustingProduct.stock} unidades</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cantidad a Ajustar (+ o -):
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAmount((prev) => prev - 5)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustAmount((prev) => prev - 1)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 text-center font-bold text-base py-1.5 border border-slate-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustAmount((prev) => prev + 1)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustAmount((prev) => prev + 5)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    +5
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nuevo stock resultante:{' '}
                  <span className="font-bold text-slate-900">
                    {Math.max(0, adjustingProduct.stock + adjustAmount)} unidades
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Motivo del Ajuste:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Reabastecimiento de Proveedor">Reabastecimiento de Proveedor</option>
                  <option value="Ajuste por Conteo Físico">Ajuste por Conteo Físico</option>
                  <option value="Merma, Rotura o Vencimiento">Merma, Rotura o Vencimiento</option>
                  <option value="Devolución de Cliente">Devolución de Cliente</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyAdjustment}
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  Confirmar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
