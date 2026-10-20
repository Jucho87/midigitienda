'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const SubscriptionBanner: React.FC = () => {
  const { isSubscriptionExpired, subscription, renewSubscription, currentTenant } = useAuth();

  if (!isSubscriptionExpired) return null;

  return (
    <div className="bg-rose-600 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm z-20">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
        <span>
          <strong>Aviso de Suscripción Expirada:</strong> La membresía comercial para{' '}
          <strong>{currentTenant.name}</strong> venció el{' '}
          {new Date(subscription.expiresAt).toLocaleDateString()}. Las transacciones del punto de venta y modificaciones de catálogo están pausadas.
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => renewSubscription(1)}
          className="flex items-center space-x-1.5 px-3 py-1 bg-white text-rose-700 font-bold rounded-lg text-xs shadow-xs hover:bg-rose-50 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Renovar Ahora (+30 Días)</span>
        </button>
      </div>
    </div>
  );
};
