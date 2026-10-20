'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { Product, POSCartItem, PaymentMethod, Order, DianCustomerData, DianIdType } from '@/types';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Send,
  AlertCircle,
  PackageX,
  Sparkles,
  ShoppingBag,
  FileCheck2,
  UserCheck,
  Building2,
  Mail,
} from 'lucide-react';

export const PosView: React.FC = () => {
  const { currentTenant, currentUser, isSubscriptionExpired, renewSubscription } = useAuth();

  // In-memory product cache for zero latency POS operations (Spec rule #3)
  const [productsCache, setProductsCache] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashAmountReceived, setCashAmountReceived] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // DIAN Colombian Invoicing State
  const [dianDocType, setDianDocType] = useState<'20' | '01'>('20'); // '20' = POS Res. 165/2023, '01' = FEV
  const [isFinalConsumer, setIsFinalConsumer] = useState<boolean>(true);
  const [customerIdType, setCustomerIdType] = useState<DianIdType>('13'); // CC por defecto
  const [customerIdNumber, setCustomerIdNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');

  // Success receipt modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load products into local POS memory cache
  const loadProducts = () => {
    const list = db.getProducts(currentTenant.id);
    setProductsCache(list);
  };

  useEffect(() => {
    loadProducts();
  }, [currentTenant.id]);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    productsCache.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [productsCache]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return productsCache.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [productsCache, searchQuery, selectedCategory]);

  // Add product to cart with local stock boundary validation
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          // Cannot add more than in stock
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.price }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock) return item; // Cannot exceed stock
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as POSCartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Barcode rapid scan handler (Enter key trigger)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const found = db.getProductByBarcode(currentTenant.id, searchQuery.trim());
    if (found) {
      addToCart(found);
      setSearchQuery('');
    }
  };

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const cartTotal = cartSubtotal; // Configurable tax if needed

  const changeDue = Math.max(0, cashAmountReceived - cartTotal);

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashAmountReceived(cartTotal);
    setPaymentReference('');
    setCheckoutError(null);
    setShowCheckoutModal(true);
  };

  // Execute atomic order transaction
  const handleExecutePayment = () => {
    try {
      setCheckoutError(null);

      const dianCustomerData: DianCustomerData = isFinalConsumer
        ? {
            idType: '13',
            idNumber: '222222222222',
            name: 'Consumidor Final',
            isFinalConsumer: true,
          }
        : {
            idType: customerIdType,
            idNumber: customerIdNumber.trim() || '222222222222',
            name: customerName.trim() || 'Cliente Mostrador',
            email: customerEmail.trim() || undefined,
            isFinalConsumer: false,
          };

      const order = db.createOrderTransaction({
        tenantId: currentTenant.id,
        userId: currentUser.id,
        userName: currentUser.name,
        items: cart,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        amountReceived: paymentMethod === 'cash' ? cashAmountReceived : cartTotal,
        dianDocumentType: dianDocType,
        dianCustomer: dianCustomerData,
      });

      // Transaction committed successfully!
      setCompletedOrder(order);
      setCart([]);
      setShowCheckoutModal(false);
      loadProducts(); // Refresh local cache with new stock levels
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCheckoutError(err.message);
      } else {
        setCheckoutError('Error desconocido al procesar la venta.');
      }
    }
  };

  // Quick cash bill chips
  const quickBills = [5, 10, 20, 50, 100];

  return (
    <div className="h-[calc(100vh-53px)] flex flex-col lg:flex-row overflow-hidden bg-slate-100">
      {/* LEFT SECTION: Search, Categories, Product Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 lg:p-5">
        {/* Top Bar: Barcode scan input & Filters */}
        <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200/80 mb-4 space-y-3">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o escanear código de barras (Presiona Enter)..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-400 bg-slate-50/50"
              />
              <Barcode className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 rounded-xl"
              >
                Limpiar
              </button>
            )}
          </form>

          {/* Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
                style={
                  selectedCategory === cat
                    ? { backgroundColor: currentTenant.primaryColor }
                    : {}
                }
              >
                {cat === 'all' ? 'Todos los Productos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <PackageX className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-sm font-medium">No se encontraron productos coincidentes</p>
              <p className="text-xs text-slate-400 mt-0.5">Intenta con otro término o limpia el buscador</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const cartQty = cart.find((i) => i.product.id === product.id)?.quantity || 0;
                const isOutOfStock = product.stock <= 0;
                const isMaxInCart = cartQty >= product.stock;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock || isMaxInCart}
                    className={`relative p-3.5 rounded-2xl text-left bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group ${
                      isOutOfStock ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                          {product.category || 'General'}
                        </span>
                        {/* Stock badge */}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : product.stock <= (product.minStock || 5)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isOutOfStock ? 'Agotado' : `${product.stock} disp.`}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 line-clamp-2 leading-snug">
                        {product.name}
                      </h4>

                      {product.barcode && (
                        <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                          {product.barcode}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">
                        {currentTenant.currency}
                        {product.price.toFixed(2)}
                      </span>

                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold transition-transform group-active:scale-90"
                        style={{ backgroundColor: currentTenant.primaryColor }}
                      >
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>

                    {/* In-cart indicator */}
                    {cartQty > 0 && (
                      <div
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: currentTenant.secondaryColor }}
                      >
                        {cartQty}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: Interactive POS Cart & Checkout */}
      <div className="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-lg">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-800 text-sm">Ticket Actual</h3>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-medium text-slate-600">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center space-x-1 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ShoppingBag className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
              <p className="text-sm font-medium">El carrito está vacío</p>
              <p className="text-xs text-slate-400 text-center max-w-[200px] mt-1">
                Haz clic en cualquier producto o escanea su código de barras
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-slate-800 truncate">
                    {item.product.name}
                  </h5>
                  <div className="text-[11px] text-slate-500">
                    {currentTenant.currency}
                    {item.unitPrice.toFixed(2)} c/u
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right min-w-[60px]">
                  <div className="text-xs font-bold text-slate-900">
                    {currentTenant.currency}
                    {(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-[10px] text-rose-500 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Checkout Button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">
                {currentTenant.currency}
                {cartSubtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total a Cobrar:</span>
              <span style={{ color: currentTenant.primaryColor }}>
                {currentTenant.currency}
                {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
            style={{ backgroundColor: currentTenant.primaryColor }}
          >
            <span>Cobrar</span>
            <span>
              ({currentTenant.currency}
              {cartTotal.toFixed(2)})
            </span>
          </button>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Completar Cobro</h3>
                <p className="text-xs text-slate-500">Selecciona el método de pago del cliente</p>
              </div>
              <div
                className="text-lg font-black px-3 py-1 rounded-xl text-white"
                style={{ backgroundColor: currentTenant.primaryColor }}
              >
                {currentTenant.currency}
                {cartTotal.toFixed(2)}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">Error en la transacción:</span>
                    <span>{checkoutError}</span>
                    {checkoutError.includes('Payment Required') && (
                      <button
                        onClick={() => {
                          renewSubscription(1);
                          setCheckoutError(null);
                        }}
                        className="mt-1.5 block text-xs underline font-bold text-rose-900"
                      >
                        Renovar Suscripción Ahora
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* DIAN Colombian Invoicing Controls */}
              {currentTenant.dianConfig?.enabled && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                      <FileCheck2 className="w-4 h-4 text-blue-700" />
                      <span>Comprobante DIAN (Software Propio)</span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      Res. 165 / 2023
                    </span>
                  </div>

                  {/* Document Type Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDianDocType('20')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center border transition-all ${
                        dianDocType === '20'
                          ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Doc. Equivalente POS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDianDocType('01');
                        setIsFinalConsumer(false); // FEV generally requires customer identification
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center border transition-all ${
                        dianDocType === '01'
                          ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Factura Electrónica (FEV)
                    </button>
                  </div>

                  {/* Customer Selector */}
                  <div className="space-y-2 pt-1 border-t border-blue-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">Cliente Adquirente:</span>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => setIsFinalConsumer(true)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isFinalConsumer
                              ? 'bg-blue-900 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          Consumidor Final
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsFinalConsumer(false)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            !isFinalConsumer
                              ? 'bg-blue-900 text-white'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          Identificar Cliente
                        </button>
                      </div>
                    </div>

                    {!isFinalConsumer && (
                      <div className="space-y-2 bg-white p-2.5 rounded-lg border border-blue-200 animate-in fade-in text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Tipo Doc</label>
                            <select
                              value={customerIdType}
                              onChange={(e) => setCustomerIdType(e.target.value as DianIdType)}
                              className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white"
                            >
                              <option value="13">CC (Cédula)</option>
                              <option value="31">NIT</option>
                              <option value="22">CE (Extranjería)</option>
                              <option value="41">Pasaporte</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-medium text-slate-500 block mb-0.5">No. Documento *</label>
                            <input
                              type="text"
                              value={customerIdNumber}
                              onChange={(e) => setCustomerIdNumber(e.target.value)}
                              placeholder="Ej. 1020304050"
                              className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Razón Social / Nombre Completo *</label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Nombre del comprador o empresa"
                            className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Correo para Factura Electrónica (DIAN)</label>
                          <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="cliente@ejemplo.com"
                            className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Method Tabs */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border text-center text-xs font-semibold flex flex-col items-center space-y-1.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-2 text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    style={
                      paymentMethod === 'cash'
                        ? { backgroundColor: currentTenant.primaryColor, borderColor: currentTenant.primaryColor }
                        : {}
                    }
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card_machine')}
                    className={`p-3 rounded-xl border text-center text-xs font-semibold flex flex-col items-center space-y-1.5 transition-all ${
                      paymentMethod === 'card_machine'
                        ? 'border-2 text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    style={
                      paymentMethod === 'card_machine'
                        ? { backgroundColor: currentTenant.primaryColor, borderColor: currentTenant.primaryColor }
                        : {}
                    }
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Terminal Tarjeta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-3 rounded-xl border text-center text-xs font-semibold flex flex-col items-center space-y-1.5 transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-2 text-white shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    style={
                      paymentMethod === 'transfer'
                        ? { backgroundColor: currentTenant.primaryColor, borderColor: currentTenant.primaryColor }
                        : {}
                    }
                  >
                    <Send className="w-5 h-5" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </div>

              {/* Specific inputs by method */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Monto Recibido del Cliente ({currentTenant.currency}):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashAmountReceived || ''}
                      onChange={(e) => setCashAmountReceived(parseFloat(e.target.value) || 0)}
                      className="w-full text-lg font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Fast bill shortcuts */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto">
                    <span className="text-[11px] text-slate-400 font-medium">Billetes:</span>
                    {quickBills.map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setCashAmountReceived(bill)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                      >
                        +{currentTenant.currency}
                        {bill}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashAmountReceived(cartTotal)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
                    >
                      Exacto
                    </button>
                  </div>

                  {/* Change calculation */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Cambio a devolver:</span>
                    <span
                      className={`text-base font-black ${
                        cashAmountReceived >= cartTotal ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {currentTenant.currency}
                      {changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'card_machine' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Número de Voucher / Autorización de Terminal POS:
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Ej. VOUCH-94821 o últimos 4 dígitos"
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <p className="text-[11px] text-slate-400">
                    Introduce el número de operación emitido por la terminal bancaria externa.
                  </p>
                </div>
              )}

              {paymentMethod === 'transfer' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Código de Referencia / Rastreo Bancario:
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Ej. TRANSF-09384"
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                  <p className="text-[11px] text-slate-400">
                    Confirma que el traspaso bancario o QR fue acreditado en la cuenta del negocio.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={paymentMethod === 'cash' && cashAmountReceived < cartTotal}
                className="px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md hover:opacity-95 disabled:opacity-40"
                style={{ backgroundColor: currentTenant.primaryColor }}
              >
                Confirmar y Emitir Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED RECEIPT MODAL */}
      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          tenant={currentTenant}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
};
