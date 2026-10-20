'use client';

import React, { useState } from 'react';
import { Store, Lock, Mail, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, password?: string) => boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Por favor introduce tu correo electrónico.');
      return;
    }
    const success = onLogin(cleanEmail, password);
    if (!success) {
      setError('Credenciales inválidas o usuario no registrado en el sistema.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 antialiased">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-slate-900 text-white p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg mx-auto mb-3">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">MiDigiTienda</h1>
          <p className="text-xs text-slate-300 mt-1">
            Plataforma ERP, POS &amp; Facturación Electrónica DIAN
          </p>
        </div>

        {/* Clean Login Form - Only Email and Password */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-800">Iniciar Sesión</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs mt-2"
            >
              Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
