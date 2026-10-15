import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Store, X, Sparkles, Check } from 'lucide-react';

interface NewTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTenantModal: React.FC<NewTenantModalProps> = ({ isOpen, onClose }) => {
  const { createNewTenant } = useAuth();

  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#F59E0B');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createNewTenant(name.trim(), primaryColor, secondaryColor);
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-slate-800" />
            <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Comercio (Tenant)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Se creará un nuevo entorno aislado de base de datos con su propio catálogo de inventario, usuarios, órdenes y suscripción de prueba.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Nombre Comercial del Negocio *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. MiniMarket Express, Farmacia San Ángel..."
              className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Color Primario
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full font-mono text-xs uppercase px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Color Secundario
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full font-mono text-xs uppercase px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Preview Badge */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Previsualización:</span>
            <div className="flex items-center space-x-2">
              <span
                className="px-3 py-1 rounded-lg text-white font-bold text-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {name || 'Mi Negocio'}
              </span>
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              Crear e Iniciar Sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
