'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Barcode,
  ScanLine,
  Zap,
  Check,
  RotateCcw,
  Sparkles,
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

  // Quick Barcode Intake & Bulk Receiving Hub
  const [showQuickScanHub, setShowQuickScanHub] = useState(false);
  const [quickScanList, setQuickScanList] = useState<{
    barcode: string;
    productId?: string;
    name: string;
    currentStock: number;
    qtyToAdd: number;
    isNew: boolean;
    cost: number;
    price: number;
  }[]>([]);
  const [quickScanInputText, setQuickScanInputText] = useState('');
  const quickScanInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    barcode: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    category: string;
    dianTaxType: 'IVA_19' | 'IVA_5' | 'IVA_0' | 'INC_8';
  }>({
    name: '',
    barcode: '',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 5,
    category: 'General',
    dianTaxType: 'IVA_19',
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

  // Toast notification for barcode scanner
  const [scanToast, setScanToast] = useState<{
    type: 'existing' | 'new';
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (!scanToast) return;
    const timer = setTimeout(() => setScanToast(null), 3500);
    return () => clearTimeout(timer);
  }, [scanToast]);

  // Acoustic feedback (Beep)
  const playScannerBeep = useCallback((type: 'success' | 'new') => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.09);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.setValueAtTime(1300, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch {
      // AudioContext fallback
    }
  }, []);

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
      dianTaxType: 'IVA_19',
    });
    setShowProductModal(true);
  };

  // Open Create Modal pre-filled with scanned barcode
  const handleOpenCreateWithBarcode = useCallback((scannedBarcode: string) => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: scannedBarcode,
      price: 0,
      cost: 0,
      stock: 10,
      minStock: 5,
      category: 'General',
      dianTaxType: 'IVA_19',
    });
    setShowProductModal(true);
  }, []);

  // Process barcode scan in Quick Scan Hub (Bulk Receiving / Audit)
  const processQuickScanBarcode = useCallback(
    (rawBarcode: string) => {
      const code = rawBarcode.trim();
      if (!code) return;

      const existing = db.getProductByBarcode(currentTenant.id, code);

      setQuickScanList((prev) => {
        const existingIdx = prev.findIndex((item) => item.barcode === code);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            qtyToAdd: updated[existingIdx].qtyToAdd + 1,
          };
          playScannerBeep('success');
          return updated;
        }

        if (existing) {
          playScannerBeep('success');
          return [
            {
              barcode: code,
              productId: existing.id,
              name: existing.name,
              currentStock: existing.stock,
              qtyToAdd: 1,
              isNew: false,
              cost: existing.cost,
              price: existing.price,
            },
            ...prev,
          ];
        } else {
          playScannerBeep('new');
          return [
            {
              barcode: code,
              name: '',
              currentStock: 0,
              qtyToAdd: 1,
              isNew: true,
              cost: 0,
              price: 0,
            },
            ...prev,
          ];
        }
      });
    },
    [currentTenant.id, playScannerBeep]
  );

  // Apply batch receiving
  const handleApplyQuickScanBatch = () => {
    if (quickScanList.length === 0) return;

    let updatedCount = 0;
    let createdCount = 0;

    for (const item of quickScanList) {
      if (item.isNew) {
        const prodName = item.name.trim() || `Producto (${item.barcode})`;
        db.createProduct(currentTenant.id, {
          name: prodName,
          barcode: item.barcode,
          price: Number(item.price) || 0,
          cost: Number(item.cost) || 0,
          stock: Number(item.qtyToAdd) || 1,
          minStock: 5,
          category: 'General',
          dianTaxType: 'IVA_19',
          isActive: true,
        });
        createdCount++;
      } else if (item.productId && item.qtyToAdd !== 0) {
        db.adjustProductStock(
          currentTenant.id,
          item.productId,
          item.qtyToAdd,
          'Entrada Masiva con Pistola Lectora'
        );
        updatedCount++;
      }
    }

    loadProducts();
    setShowQuickScanHub(false);
    setQuickScanList([]);
    setScanToast({
      type: 'existing',
      title: '✅ Lote de Inventario Procesado',
      description: `Se actualizaron ${updatedCount} productos y se crearon ${createdCount} nuevos en catálogo.`,
    });
  };

  // Global Barcode Scanner Gun Listener for Inventory
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT');
      const isQuickScanInput = activeEl === quickScanInputRef.current;

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        // If focused in quickScan input, form submit handles it
        if (isQuickScanInput) {
          return;
        }

        const barcode = buffer.trim();
        buffer = '';

        if (barcode.length >= 2) {
          // 1. If Quick Scan Hub is open
          if (showQuickScanHub) {
            processQuickScanBarcode(barcode);
            e.preventDefault();
            return;
          }

          // 2. If standard Product Modal is open, fill barcode field directly
          if (showProductModal) {
            setFormData((prev) => ({ ...prev, barcode }));
            playScannerBeep('success');
            setScanToast({
              type: 'existing',
              title: `Código Capturado en Formulario`,
              description: `Se vinculó el código "${barcode}" al producto.`,
            });
            e.preventDefault();
            return;
          }

          // 3. If no modal is open
          const existing = db.getProductByBarcode(currentTenant.id, barcode);
          if (existing) {
            playScannerBeep('success');
            setAdjustingProduct(existing);
            setAdjustAmount(0);
            setAdjustReason('Reabastecimiento');
            setShowAdjustModal(true);
            setScanToast({
              type: 'existing',
              title: `📦 "${existing.name}" Localizado`,
              description: `Stock actual: ${existing.stock} uds. Modal de entrada/ajuste de inventario abierto.`,
            });
          } else {
            playScannerBeep('new');
            handleOpenCreateWithBarcode(barcode);
            setScanToast({
              type: 'new',
              title: `✨ Nuevo Artículo Escaneado`,
              description: `Código "${barcode}". Formulario de creación abierto con código listo.`,
            });
          }
          e.preventDefault();
        }
        return;
      }

      if (e.key.length > 1) return;

      // Ignore manual typing in inputs when not scanning
      if (isInput && !isQuickScanInput) return;

      if (diff > 80) {
        buffer = e.key;
      } else {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    showQuickScanHub,
    showProductModal,
    currentTenant.id,
    playScannerBeep,
    handleOpenCreateWithBarcode,
    processQuickScanBarcode,
  ]);

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
      dianTaxType: (p.dianTaxType as 'IVA_19' | 'IVA_5' | 'IVA_0' | 'INC_8') || 'IVA_19',
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
          dianTaxType: formData.dianTaxType,
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
          dianTaxType: formData.dianTaxType,
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Barcode className="w-4 h-4 text-emerald-600" />
            <span>Pistola Lectora Activa</span>
          </span>

          <Can I="products.update">
            <button
              onClick={() => {
                setQuickScanList([]);
                setShowQuickScanHub(true);
              }}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
              title="Abrir hub de recepción masiva de cajas/mercancía o conteo físico de inventario con pistola lectora"
            >
              <ScanLine className="w-4 h-4 text-emerald-400" />
              <span>Recepción / Conteo con Pistola</span>
            </button>
          </Can>

          <Can I="products.create">
            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity"
              style={{ backgroundColor: currentTenant.primaryColor }}
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </Can>
        </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Código de Barras
                    </label>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 border border-emerald-200">
                      <Barcode className="w-3 h-3 text-emerald-600" />
                      Pistola lista
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Dispare con pistola o escriba..."
                      className="w-full text-xs px-3 py-2 pl-8 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-400"
                    />
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
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

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tratamiento Tributario / Impuesto DIAN (Colombia)
                </label>
                <select
                  value={formData.dianTaxType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dianTaxType: e.target.value as 'IVA_19' | 'IVA_5' | 'IVA_0' | 'INC_8',
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="IVA_19">IVA General (19%) - Tarifa estándar</option>
                  <option value="IVA_5">IVA Reducido (5%) - Alimentos básicos, insumos</option>
                  <option value="IVA_0">Exento / Excluido (0%) - Bienes exentos de ley</option>
                  <option value="INC_8">Impuesto Nacional al Consumo INC (8%) - Restaurantes y bares</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Se discrimina automáticamente en la Factura Electrónica y Ticket POS conforme al E.T.
                </span>
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

      {/* QUICK SCAN HUB MODAL (RECEPCIÓN Y CONTEO POR PISTOLA LECTORA) */}
      {showQuickScanHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ScanLine className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Recepción y Carga Rápida con Pistola
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold uppercase tracking-wider">
                      Modo Escaneo Continuo
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Dispare la pistola a los códigos de barras. Cada disparo suma unidades al lote en tiempo real.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickScanHub(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Bar for manual typing / scanner gun input */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (quickScanInputText.trim()) {
                    processQuickScanBarcode(quickScanInputText.trim());
                    setQuickScanInputText('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={quickScanInputRef}
                    type="text"
                    value={quickScanInputText}
                    onChange={(e) => setQuickScanInputText(e.target.value)}
                    placeholder="Esperando pistola lectora... (o escriba código y presione Enter)"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
                >
                  Procesar Código
                </button>
              </form>
            </div>

            {/* Scanned Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {quickScanList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Barcode className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Sin artículos escaneados en esta sesión</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Apunte la pistola a las cajas o productos y comience a disparar. Si el producto ya existe se sumarán unidades; si es nuevo, podrá asignarle nombre y precio.
                    </p>
                  </div>
                </div>
              ) : (
                quickScanList.map((item, index) => (
                  <div
                    key={`${item.barcode}-${index}`}
                    className={`p-3.5 rounded-xl border transition-all ${
                      item.isNew
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold border border-slate-200">
                            {item.barcode}
                          </span>
                          {item.isNew ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                              ✨ Nuevo en Catálogo
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
                              Stock Actual: {item.currentStock} uds
                            </span>
                          )}
                        </div>

                        {item.isNew ? (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuickScanList((prev) =>
                                  prev.map((it, idx) => (idx === index ? { ...it, name: val } : it))
                                );
                              }}
                              placeholder="Nombre del producto *"
                              className="text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cost || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setQuickScanList((prev) =>
                                  prev.map((it, idx) => (idx === index ? { ...it, cost: val } : it))
                                );
                              }}
                              placeholder="Costo unitario"
                              className="text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setQuickScanList((prev) =>
                                  prev.map((it, idx) => (idx === index ? { ...it, price: val } : it))
                                );
                              }}
                              placeholder="Precio de venta *"
                              className="text-xs px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white font-bold"
                            />
                          </div>
                        ) : (
                          <div className="font-semibold text-slate-800 text-sm mt-1 truncate">
                            {item.name}
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickScanList((prev) =>
                                prev
                                  .map((it, idx) =>
                                    idx === index ? { ...it, qtyToAdd: Math.max(1, it.qtyToAdd - 1) } : it
                                  )
                              );
                            }}
                            className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qtyToAdd}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setQuickScanList((prev) =>
                                prev.map((it, idx) => (idx === index ? { ...it, qtyToAdd: val } : it))
                              );
                            }}
                            className="w-14 text-center text-xs font-bold bg-white py-1.5 border-x border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setQuickScanList((prev) =>
                                prev.map((it, idx) =>
                                  idx === index ? { ...it, qtyToAdd: it.qtyToAdd + 1 } : it
                                )
                              );
                            }}
                            className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-200 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        {!item.isNew && (
                          <span className="text-[11px] font-semibold text-emerald-700 min-w-[70px]">
                            → {item.currentStock + item.qtyToAdd} uds
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setQuickScanList((prev) => prev.filter((_, idx) => idx !== index));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Quitar del lote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary & Action */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">{quickScanList.length}</span> referencias en lote •{' '}
                <span className="font-bold text-slate-900">
                  {quickScanList.reduce((acc, curr) => acc + curr.qtyToAdd, 0)}
                </span>{' '}
                unidades totales a cargar
              </div>

              <div className="flex items-center space-x-2">
                {quickScanList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuickScanList([])}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowQuickScanHub(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  disabled={quickScanList.length === 0}
                  onClick={handleApplyQuickScanBatch}
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs disabled:opacity-50 transition-opacity flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar e Ingresar al Inventario</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BARCODE SCANNER TOAST NOTIFICATION */}
      {scanToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-start space-x-3 p-3.5 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-5 duration-200 max-w-sm ${
            scanToast.type === 'existing'
              ? 'bg-slate-900 border-slate-800 text-white'
              : 'bg-emerald-950 border-emerald-800 text-white'
          }`}
        >
          <div
            className={`p-2 rounded-xl shrink-0 ${
              scanToast.type === 'existing'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-emerald-500 text-white shadow-xs'
            }`}
          >
            <Barcode className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold flex items-center justify-between text-white">
              <span>{scanToast.title}</span>
              <button
                onClick={() => setScanToast(null)}
                className="text-slate-400 hover:text-white p-0.5 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              {scanToast.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
