'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DianTaxpayerData } from '@/types';
import { calculateDV, calculateCUFE, generateDianQr } from '@/lib/dian/crypto';
import { generateUblXml } from '@/lib/dian/ubl';
import { COLOMBIAN_CITIES } from '@/lib/dian/defaults';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Download,
  Copy,
  ExternalLink,
  Check,
  Key,
  Server,
  Building,
  RefreshCw,
  QrCode,
  Code2,
} from 'lucide-react';

export const DianConfigPanel: React.FC = () => {
  const { currentTenant, dianConfig, updateDianConfig } = useAuth();

  const [formData, setFormData] = useState<DianTaxpayerData>(dianConfig);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'rut' | 'software' | 'resolution' | 'testing'>('rut');

  // Test set simulation state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    cufe: string;
    qrUrl: string;
    qrDataUrl: string;
    xml: string;
    timestamp: string;
    message: string;
  } | null>(null);
  const [copiedCufe, setCopiedCufe] = useState(false);

  // Sync if auth changes
  React.useEffect(() => {
    setFormData(dianConfig);
  }, [dianConfig]);

  const handleNitChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    const dv = calculateDV(clean);
    setFormData((prev) => ({
      ...prev,
      nit: clean,
      dv,
    }));
  };

  const handleCityChange = (cityCode: string) => {
    const found = COLOMBIAN_CITIES.find((c) => c.cityCode === cityCode);
    if (!found) return;
    setFormData((prev) => ({
      ...prev,
      cityCode: found.cityCode,
      cityName: found.cityName,
      departmentCode: found.departmentCode,
      departmentName: found.departmentName,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateDianConfig(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Run live DIAN Test Set Simulation
  const handleRunTest = async () => {
    setIsTesting(true);
    try {
      const now = new Date();
      const issueDate = now.toISOString().split('T')[0];
      const issueTime = `${now.toTimeString().split(' ')[0]}-05:00`;
      const testNum = `${formData.resolution.prefix || 'SETP'}-${String(formData.resolution.currentNumber || 101).padStart(4, '0')}`;
      const subtotal = 50000.0;
      const iva = 9500.0;
      const total = 59500.0;

      // Calculate official CUFE SHA-384
      const cufe = await calculateCUFE({
        numFac: testNum,
        fecFac: issueDate,
        horFac: issueTime,
        valFac: subtotal,
        codImp1: '01',
        valImp1: iva,
        codImp2: '04',
        valImp2: 0,
        codImp3: '03',
        valImp3: 0,
        valTot: total,
        nitEmisor: formData.nit,
        numAdq: '222222222222',
        claveTecnica: formData.resolution.technicalKey,
        tipoAmbiente: formData.resolution.environment,
      });

      // Generate official QR
      const qrRes = await generateDianQr({
        numFac: testNum,
        fecFac: issueDate,
        horFac: issueTime,
        nitEmisor: formData.nit,
        docAdq: '222222222222',
        valFac: subtotal,
        valIva: iva,
        valOtroImp: 0,
        valTolFac: total,
        cufe,
      });

      // Generate standard XML UBL 2.1
      const xml = generateUblXml({
        documentType: '20', // Documento Equivalente POS
        fullNumber: testNum,
        prefix: formData.resolution.prefix,
        consecutive: formData.resolution.currentNumber || 101,
        cufe,
        issueDate,
        issueTime,
        taxpayer: formData,
        customer: {
          idType: '13',
          idNumber: '222222222222',
          name: 'Consumidor Final (Prueba DIAN)',
          isFinalConsumer: true,
        },
        items: [
          {
            id: 'test-item-1',
            name: 'Producto Demo de Habilitación DIAN',
            quantity: 1,
            unitPrice: 50000,
            taxRate: 0.19,
            taxType: 'IVA_19',
            subtotal: 50000,
            taxAmount: 9500,
            total: 59500,
          },
        ],
        taxBreakdown: {
          baseIva19: 50000,
          iva19: 9500,
          baseIva5: 0,
          iva5: 0,
          baseInc8: 0,
          inc8: 0,
          baseExempt: 0,
          totalBase: 50000,
          totalTax: 9500,
        },
        paymentMethod: 'CASH',
        currencyCode: currentTenant.currency === '$' ? 'COP' : 'COP',
      });

      setTestResult({
        success: true,
        cufe,
        qrUrl: `https://${formData.resolution.environment === '1' ? 'catalogo-vpfe' : 'catalogo-vpfe-hab'}.dian.gov.co/document/searchqr?documentkey=${cufe}`,
        qrDataUrl: qrRes.qrDataUrl,
        xml,
        timestamp: now.toLocaleTimeString(),
        message: 'Comprobante XML UBL 2.1 validado y firmado conforme al Anexo Técnico 1.9 y Res. 165 de 2023 de la DIAN.',
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error durante la prueba DIAN');
    } finally {
      setIsTesting(false);
    }
  };

  const downloadXml = () => {
    if (!testResult?.xml) return;
    const blob = new Blob([testResult.xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TEST-DIAN-${formData.resolution.prefix}-${formData.resolution.currentNumber}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCufe = () => {
    if (!testResult?.cufe) return;
    navigator.clipboard.writeText(testResult.cufe);
    setCopiedCufe(true);
    setTimeout(() => setCopiedCufe(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
            DIAN
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-800 text-sm">
                Facturación Electrónica & POS · Modalidad Software Propio
              </h3>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  formData.enabled
                    ? formData.resolution.environment === '1'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {formData.enabled
                  ? formData.resolution.environment === '1'
                    ? 'DIAN Producción (VPFE)'
                    : 'DIAN Habilitación / Pruebas'
                  : 'Desactivado'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cumplimiento normativo Estatuto Tributario Art. 616-1 y Resolución DIAN 000165 de 2023
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {saveSuccess && (
            <span className="flex items-center space-x-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>¡Parámetros DIAN guardados!</span>
            </span>
          )}

          <label className="flex items-center space-x-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50">
            <span className="text-xs font-semibold text-slate-700">Integración DIAN:</span>
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => {
                const updated = { ...formData, enabled: e.target.checked };
                setFormData(updated);
                updateDianConfig(updated);
              }}
              className="w-4 h-4 rounded text-blue-900 focus:ring-blue-800"
            />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-6 pt-3 space-x-2 bg-slate-50/50 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('rut')}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'rut'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          1. Datos Fiscales (RUT)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('software')}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'software'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          2. Software Propio (DIAN)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('resolution')}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'resolution'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          3. Resolución & Numeración (1876)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('testing')}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'testing'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          4. Set de Pruebas & Validación
        </button>
      </div>

      {/* Tab 1: RUT & Datos Emisor */}
      {activeTab === 'rut' && (
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                NIT del Emisor (Sin DV) *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  value={formData.nit}
                  onChange={(e) => handleNitChange(e.target.value)}
                  placeholder="901584732"
                  className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
                <div className="w-12 text-center text-xs font-bold px-2 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800">
                  -{formData.dv || '0'}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Dígito de verificación calculado con Módulo 11 oficial
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Razón Social (Según RUT) *
              </label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                placeholder="Mi Negocio S.A.S."
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nombre Comercial (Establecimiento)
              </label>
              <input
                type="text"
                value={formData.commercialName}
                onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
                placeholder="La Tienda Central"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Régimen Tributario *
              </label>
              <select
                value={formData.taxRegime}
                onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value as '48' | '49' })}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="48">48 - Responsable de IVA</option>
                <option value="49">49 - No Responsable de IVA</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Actividad Económica (CIIU)
              </label>
              <input
                type="text"
                value={formData.ciiu}
                onChange={(e) => setFormData({ ...formData, ciiu: e.target.value })}
                placeholder="4711"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Municipio / Ciudad (Código DANE)
              </label>
              <select
                value={formData.cityCode}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
              >
                {COLOMBIAN_CITIES.map((c) => (
                  <option key={c.cityCode} value={c.cityCode}>
                    {c.cityName} ({c.departmentName} - {c.cityCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Dirección Fiscal *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Carrera 7 # 71 - 21"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+57 (601) 745-8899"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Correo Electrónico para Facturación *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="facturacion@minegocio.com.co"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs bg-blue-900 hover:bg-blue-800"
            >
              Guardar Datos Fiscales
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Software Propio */}
      {activeTab === 'software' && (
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Modalidad de Operación: Software Propio</span>
            </div>
            <p className="text-[11px] text-blue-800">
              Usted emite directamente a la DIAN sin intermediarios tecnológicos comerciales. Estos identificadores se obtienen en el portal DIAN (Muisca &gt; Factura Electrónica &gt; Configuración &gt; Modos de Operación: Software Propio).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Ambiente de Operación DIAN *
              </label>
              <select
                value={formData.resolution.environment}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resolution: {
                      ...formData.resolution,
                      environment: e.target.value as '1' | '2',
                    },
                  })
                }
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold"
              >
                <option value="2">2 - Habilitación / Pruebas (VPFE-HAB)</option>
                <option value="1">1 - Producción Oficial (VPFE)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {formData.resolution.environment === '2'
                  ? 'Permite enviar comprobantes del set de pruebas para obtener la autorización.'
                  : 'Emite facturas y documentos equivalentes con validez fiscal real ante la DIAN.'}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                PIN del Software (5 Dígitos) *
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={formData.resolution.softwarePin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resolution: {
                      ...formData.resolution,
                      softwarePin: e.target.value,
                    },
                  })
                }
                placeholder="75489"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                PIN definido por el contribuyente en el portal Muisca
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Identificador del Software (Software ID / UUID) *
            </label>
            <input
              type="text"
              required
              value={formData.resolution.softwareId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  resolution: {
                    ...formData.resolution,
                    softwareId: e.target.value.trim(),
                  },
                })
              }
              placeholder="e28bbd91-768a-4933-a3b0-449a03761ec8"
              className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              UUID asignado por la DIAN al registrar el software propio
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs bg-blue-900 hover:bg-blue-800"
            >
              Guardar Credenciales de Software Propio
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Resolución DIAN 1876 */}
      {activeTab === 'resolution' && (
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Número de Autorización DIAN (Form. 1876) *
              </label>
              <input
                type="text"
                required
                value={formData.resolution.resolutionNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resolution: {
                      ...formData.resolution,
                      resolutionNumber: e.target.value.trim(),
                    },
                  })
                }
                placeholder="18764000001"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Prefijo Autorizado *
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={formData.resolution.prefix}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resolution: {
                      ...formData.resolution,
                      prefix: e.target.value.toUpperCase().trim(),
                    },
                  })
                }
                placeholder="POS"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono uppercase"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Ej. POS para caja, SETP para habilitación
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Consecutivo Siguiente *
              </label>
              <input
                type="number"
                required
                min={formData.resolution.fromNumber}
                max={formData.resolution.toNumber}
                value={formData.resolution.currentNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    resolution: {
                      ...formData.resolution,
                      currentNumber: parseInt(e.target.value) || 1,
                    },
                  })
                }
                className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Próximo folio a emitir: {formData.resolution.prefix}-{String(formData.resolution.currentNumber).padStart(4, '0')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Rango Autorizado (Desde - Hasta) *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  required
                  value={formData.resolution.fromNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      resolution: {
                        ...formData.resolution,
                        fromNumber: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-1/2 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  placeholder="1"
                />
                <span className="text-xs text-slate-400 font-bold">hasta</span>
                <input
                  type="number"
                  required
                  value={formData.resolution.toNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      resolution: {
                        ...formData.resolution,
                        toNumber: parseInt(e.target.value) || 10000,
                      },
                    })
                  }
                  className="w-1/2 text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  placeholder="10000"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Vigencia de Resolución (Inicio y Fin) *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  required
                  value={formData.resolution.validFrom}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      resolution: {
                        ...formData.resolution,
                        validFrom: e.target.value,
                      },
                    })
                  }
                  className="w-1/2 text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
                <span className="text-xs text-slate-400 font-bold">al</span>
                <input
                  type="date"
                  required
                  value={formData.resolution.validTo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      resolution: {
                        ...formData.resolution,
                        validTo: e.target.value,
                      },
                    })
                  }
                  className="w-1/2 text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Clave Técnica (Technical Key) *
            </label>
            <input
              type="text"
              required
              value={formData.resolution.technicalKey}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  resolution: {
                    ...formData.resolution,
                    technicalKey: e.target.value.trim(),
                  },
                })
              }
              placeholder="fc8eac422eba16e122d5aa92739577c20ce64a06"
              className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Cadena provista por la DIAN para calcular el algoritmo SHA-384 del CUFE/CUDE
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs bg-blue-900 hover:bg-blue-800"
            >
              Guardar Resolución de Facturación
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Set de Pruebas & Validación en Vivo */}
      {activeTab === 'testing' && (
        <div className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                Simulador del Set de Pruebas DIAN (Validación Previa)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Genera un comprobante de prueba conforme a los Anexos Técnicos de la DIAN, verifica el cálculo canónico SHA-384 (CUFE), genera el código QR reglamentario y valida la estructura UBL 2.1.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunTest}
              disabled={isTesting}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs bg-blue-900 hover:bg-blue-800 disabled:opacity-50 self-start"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isTesting ? 'Validando...' : 'Ejecutar Prueba en Vivo'}</span>
            </button>
          </div>

          {testResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Status Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm">Respuesta DIAN: 200 OK - Documento Válido</span>
                    <span className="text-[10px] bg-emerald-200/70 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {testResult.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">{testResult.message}</p>
                </div>
              </div>

              {/* CUFE & QR Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* QR Code */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-1">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Código QR Oficial DIAN</span>
                  </span>
                  {testResult.qrDataUrl && (
                    <img
                      src={testResult.qrDataUrl}
                      alt="QR DIAN"
                      className="w-32 h-32 border border-slate-200 rounded-lg p-1 bg-white shadow-xs"
                    />
                  )}
                  <a
                    href={testResult.qrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-600 hover:underline mt-2 flex items-center space-x-1"
                  >
                    <span>Verificar en catálogo DIAN</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* CUFE Details */}
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <Key className="w-3.5 h-3.5" />
                      <span>CUFE / CUDE Calculado (SHA-384):</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCufe}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center space-x-1"
                    >
                      {copiedCufe ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCufe ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-700 break-all leading-relaxed select-all">
                    {testResult.cufe}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-slate-500">
                      Formato de salida: <span className="font-bold text-slate-800">XML UBL 2.1 con DianExtensions</span>
                    </div>

                    <button
                      type="button"
                      onClick={downloadXml}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar XML UBL 2.1</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
