'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { User, Role, Permission } from '@/types';
import { SYSTEM_PERMISSIONS } from '@/services/seedData';
import {
  Users as UsersIcon,
  Shield,
  Plus,
  Check,
  X,
  Lock,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  AlertCircle,
  KeyRound,
  Grid3X3,
  Layers,
  CheckSquare,
  Square,
  Search,
  ShoppingCart,
  Package,
  FileCheck2,
  UserSquare2,
  BarChart3,
  LifeBuoy,
  Settings,
  HelpCircle,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { currentTenant, hasPermission, refreshState, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'matrix'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [matrixFilterModule, setMatrixFilterModule] = useState<string>('all');
  const [matrixSearch, setMatrixSearch] = useState<string>('');

  // User creation modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('');

  // User edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState('');

  // Reset password modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPwd, setResetPwd] = useState('');

  // Role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermSlugs, setSelectedPermSlugs] = useState<string[]>([]);

  const loadData = () => {
    const uList = db.getUsers(currentTenant.id);
    const rList = db.getRoles(currentTenant.id);
    setUsers(uList);
    setRoles(rList);
    if (rList.length > 0 && !newUserRole) {
      setNewUserRole(rList[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant.id]);

  // Check if any user in the company is missing a role
  const usersWithoutRole = useMemo(() => {
    return users.filter((u) => !u.roleId || !roles.some((r) => r.id === u.roleId));
  }, [users, roles]);

  const moduleMeta: Record<
    string,
    { name: string; icon: React.ComponentType<{ className?: string }>; color: string }
  > = {
    orders: { name: 'Punto de Venta & Caja', icon: ShoppingCart, color: 'text-emerald-600 bg-emerald-50' },
    products: { name: 'Inventario & Catálogo', icon: Package, color: 'text-blue-600 bg-blue-50' },
    dian: { name: 'Facturación Electrónica DIAN', icon: FileCheck2, color: 'text-indigo-600 bg-indigo-50' },
    customers: { name: 'Clientes & Terceros', icon: UserSquare2, color: 'text-amber-600 bg-amber-50' },
    reports: { name: 'Reportes & Finanzas', icon: BarChart3, color: 'text-violet-600 bg-violet-50' },
    users: { name: 'Personal & Roles RBAC', icon: UsersIcon, color: 'text-cyan-600 bg-cyan-50' },
    support: { name: 'Mesa de Soporte', icon: LifeBuoy, color: 'text-rose-600 bg-rose-50' },
    settings: { name: 'Configuración & Marca', icon: Settings, color: 'text-slate-600 bg-slate-100' },
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">Crear</span>;
      case 'read':
      case 'view':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800">Consultar</span>;
      case 'update':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">Editar</span>;
      case 'delete':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">Eliminar</span>;
      case 'export':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800">Exportar</span>;
      case 'discount':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-800">Descuento</span>;
      case 'stock_adjust':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800">Stock</span>;
      case 'pos_equivalent':
      case 'fev_invoice':
      case 'credit_note':
      case 'config':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">DIAN</span>;
      default:
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  if (!hasPermission('users.manage') && !hasPermission('users.read')) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-base">Permiso Insuficiente (403 Forbidden)</h3>
        <p className="text-xs text-slate-500 mt-1">
          Solo los usuarios autorizados con el permiso <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">users.manage</code> pueden gestionar empleados y la permisología granular.
        </p>
      </div>
    );
  }

  // Group permissions by module
  const permissionsByModule = SYSTEM_PERMISSIONS.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    if (!newUserRole) {
      alert('Debes seleccionar un rol obligatorio para el empleado.');
      return;
    }
    if (newUserPassword.trim().length < 6) {
      alert('La contraseña del empleado debe tener al menos 6 caracteres.');
      return;
    }

    try {
      db.createUser(currentTenant.id, {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        roleId: newUserRole,
        password: newUserPassword,
      });
      setShowUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      loadData();
      refreshState();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al registrar el empleado');
    }
  };

  // Open Edit User modal
  const handleOpenEditUser = (u: User) => {
    setEditUser(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserRole(u.roleId || (roles[0]?.id || ''));
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (!editUserRole) {
      alert('El empleado debe tener un rol asignado obligatoriamente.');
      return;
    }

    try {
      db.updateUser(currentTenant.id, editUser.id, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        roleId: editUserRole,
      });
      setEditUser(null);
      loadData();
      refreshState();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar el empleado');
    }
  };

  // Reset an employee's password
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (resetPwd.trim().length < 6) {
      alert('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      db.updateUser(currentTenant.id, resetUser.id, { password: resetPwd });
      setResetUser(null);
      setResetPwd('');
      alert('Contraseña actualizada con éxito.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
    }
  };

  // Toggle user active status
  const handleToggleUserStatus = (u: User) => {
    if (u.id === currentUser.id) {
      alert('No puedes desactivar tu propia cuenta activa.');
      return;
    }
    db.updateUser(currentTenant.id, u.id, { isActive: !u.isActive });
    loadData();
    refreshState();
  };

  // Change user role quickly
  const handleChangeUserRole = (userId: string, roleId: string) => {
    try {
      db.updateUser(currentTenant.id, userId, { roleId });
      loadData();
      refreshState();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al cambiar rol');
    }
  };

  // Delete user
  const handleDeleteUser = (u: User) => {
    if (u.id === currentUser.id) {
      alert('No puedes eliminar tu propio usuario actual.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar a "${u.name}" (${u.email})? Esta acción revocará todos sus accesos.`)) {
      try {
        db.deleteUser(currentTenant.id, u.id);
        loadData();
        refreshState();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error al eliminar usuario');
      }
    }
  };

  // Open Create/Edit Role Modal
  const handleOpenRoleModal = (role?: Role) => {
    if (role) {
      setEditingRoleId(role.id);
      setRoleName(role.name);
      setRoleDescription(role.description || '');
      setSelectedPermSlugs(db.getPermissionsForRole(role.id));
    } else {
      setEditingRoleId(null);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermSlugs(['orders.view', 'orders.create', 'orders.read', 'products.read', 'customers.read', 'support.read']);
    }
    setShowRoleModal(true);
  };

  // Toggle permission checkbox in role modal
  const togglePermissionSlug = (slug: string) => {
    setSelectedPermSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // Select all / Deselect all for a module
  const setModulePermissions = (moduleKey: string, enable: boolean) => {
    const moduleSlugs = (permissionsByModule[moduleKey] || []).map((p) => p.slug);
    setSelectedPermSlugs((prev) => {
      if (enable) {
        return Array.from(new Set([...prev, ...moduleSlugs]));
      } else {
        return prev.filter((s) => !moduleSlugs.includes(s));
      }
    });
  };

  // Save Role
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    try {
      if (editingRoleId) {
        db.updateRole(currentTenant.id, editingRoleId, roleName, roleDescription, selectedPermSlugs);
      } else {
        db.createRole(currentTenant.id, roleName, roleDescription, selectedPermSlugs);
      }
      setShowRoleModal(false);
      loadData();
      refreshState();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar el rol');
    }
  };

  // Delete Role
  const handleDeleteRole = (r: Role) => {
    const assignedUsers = users.filter((u) => u.roleId === r.id);
    if (assignedUsers.length > 0) {
      alert(`No se puede eliminar el rol "${r.name}" porque tiene ${assignedUsers.length} empleado(s) asignado(s). Primero cámbiales el rol.`);
      return;
    }
    if (confirm(`¿Estás seguro de eliminar el rol "${r.name}"?`)) {
      try {
        db.deleteRole(currentTenant.id, r.id);
        loadData();
        refreshState();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error al eliminar el rol');
      }
    }
  };

  // Live toggle in matrix view
  const handleToggleMatrixPermission = (roleId: string, slug: string) => {
    try {
      const currentPerms = db.getPermissionsForRole(roleId);
      const newPerms = currentPerms.includes(slug)
        ? currentPerms.filter((s) => s !== slug)
        : [...currentPerms, slug];
      const role = roles.find((r) => r.id === roleId);
      if (role) {
        db.updateRole(currentTenant.id, roleId, role.name, role.description || '', newPerms);
        loadData();
        refreshState();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar permiso');
    }
  };

  // Filter permissions for the matrix tab
  const filteredMatrixPermissions = useMemo(() => {
    return SYSTEM_PERMISSIONS.filter((p) => {
      const matchesModule = matrixFilterModule === 'all' || p.module === matrixFilterModule;
      const matchesSearch =
        !matrixSearch.trim() ||
        p.label.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        p.slug.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(matrixSearch.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [matrixFilterModule, matrixSearch]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Control de Acceso & Permisología Granular (RBAC)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentTenant.name} • Todos los empleados están asociados a un rol específico con permisos atómicos
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-2.5">
          {activeTab === 'users' ? (
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity self-start"
              style={{ backgroundColor: currentTenant.primaryColor || '#0f172a' }}
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Empleado</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenRoleModal()}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity self-start"
              style={{ backgroundColor: currentTenant.primaryColor || '#0f172a' }}
            >
              <Plus className="w-4 h-4" />
              <span>Crear Rol Personalizado</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning if any user lacks a role */}
      {usersWithoutRole.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Atención:</strong> Hay <strong>{usersWithoutRole.length} usuario(s)</strong> sin rol asignado en esta empresa. Para que la seguridad granular funcione, asigna un rol a cada usuario.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('users')}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] whitespace-nowrap shadow-xs"
          >
            Ver Empleados
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 pb-3 px-3.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          style={activeTab === 'users' ? { borderColor: currentTenant.primaryColor || '#0f172a', color: currentTenant.primaryColor || '#0f172a' } : {}}
        >
          <UsersIcon className="w-4 h-4" />
          <span>Equipo & Empleados ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center space-x-2 pb-3 px-3.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'roles'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          style={activeTab === 'roles' ? { borderColor: currentTenant.primaryColor || '#0f172a', color: currentTenant.primaryColor || '#0f172a' } : {}}
        >
          <Shield className="w-4 h-4" />
          <span>Roles de la Empresa ({roles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-2 pb-3 px-3.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'matrix'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          style={activeTab === 'matrix' ? { borderColor: currentTenant.primaryColor || '#0f172a', color: currentTenant.primaryColor || '#0f172a' } : {}}
        >
          <Grid3X3 className="w-4 h-4" />
          <span>Matriz Completa de Permisología ({SYSTEM_PERMISSIONS.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. USERS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Directorio de Empleados de la Empresa
              </h3>
              <p className="text-[11px] text-slate-500">
                Cada cuenta tiene asignado un rol específico que define con exactitud qué módulos y acciones puede ejecutar.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
              {users.length} empleado(s)
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Empleado / Nombre</th>
                <th className="py-3.5 px-4">Correo Electrónico</th>
                <th className="py-3.5 px-4">Rol Asignado (Obligatorio)</th>
                <th className="py-3.5 px-4 text-center">Permisos Activos</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-slate-600">No hay empleados registrados en esta empresa.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Usa el botón "Registrar Empleado" para crear el primer acceso de personal.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const role = roles.find((r) => r.id === u.roleId);
                  const isCurrent = u.id === currentUser.id;
                  const permsCount = role ? db.getPermissionsForRole(role.id).length : 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-md font-bold">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <select
                            value={u.roleId || ''}
                            onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                              !u.roleId
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-slate-200 bg-white text-slate-800'
                            }`}
                          >
                            <option value="">⚠️ Sin Rol Asignado</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} {r.isSystem ? '(Sistema)' : '(Personalizado)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
                          <span>{permsCount}</span>
                          <span className="text-slate-400">/{SYSTEM_PERMISSIONS.length}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Editar Datos del Empleado"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setResetUser(u); setResetPwd(''); }}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Restablecer Contraseña"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.isActive
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={u.isActive ? 'Desactivar acceso' : 'Activar acceso'}
                          >
                            {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar Cuenta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ========================================================================= */}
      {/* 2. ROLES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r) => {
              const perms = db.getPermissionsForRole(r.id);
              const assignedCount = users.filter((u) => u.roleId === r.id).length;

              // Module breakdown for this role
              const moduleSummary = Object.entries(permissionsByModule).map(([modKey, modPerms]) => {
                const count = modPerms.filter((p) => perms.includes(p.slug)).length;
                return { key: modKey, count, total: modPerms.length };
              });

              return (
                <div
                  key={r.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                          {r.isSystem && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-md">
                              Sistema
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          ID: {r.id}
                        </span>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                        {assignedCount} empleado(s)
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {r.description || 'Perfil de permisos estándar'}
                    </p>

                    {/* Breakdown by module */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Cobertura por Módulo ({perms.length}/{SYSTEM_PERMISSIONS.length}):
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-700">
                          {Math.round((perms.length / SYSTEM_PERMISSIONS.length) * 100)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {moduleSummary.map((m) => {
                          const meta = moduleMeta[m.key];
                          const hasAll = m.count === m.total && m.total > 0;
                          const hasSome = m.count > 0 && m.count < m.total;

                          return (
                            <div
                              key={m.key}
                              className={`p-1.5 rounded-lg text-[10px] flex items-center justify-between border ${
                                hasAll
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 font-semibold'
                                  : hasSome
                                  ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                                  : 'bg-slate-50 border-slate-100 text-slate-400'
                              }`}
                            >
                              <span className="truncate pr-1">{meta?.name?.split(' ')[0] || m.key}</span>
                              <span className="font-mono font-bold">
                                {m.count}/{m.total}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setMatrixFilterModule('all');
                        setActiveTab('matrix');
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Ver en Matriz
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenRoleModal(r)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Configurar Permisos</span>
                      </button>

                      {!r.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar Rol"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FULL MATRIX VIEW (TODOS LOS MÓDULOS Y ACCIONES) */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          {/* Matrix Header & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Grid3X3 className="w-4 h-4 text-emerald-600" />
                <span>Matriz Detallada de Permisología por Módulo</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualiza y conmuta con un clic qué acciones exactas puede ejecutar cada rol en cada módulo del sistema.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar permiso..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg w-44 focus:outline-hidden focus:border-slate-400"
                />
              </div>

              <select
                value={matrixFilterModule}
                onChange={(e) => setMatrixFilterModule(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
              >
                <option value="all">Todos los Módulos ({SYSTEM_PERMISSIONS.length})</option>
                <option value="orders">Punto de Venta & Caja</option>
                <option value="products">Inventario & Catálogo</option>
                <option value="dian">Facturación Electrónica DIAN</option>
                <option value="customers">Clientes & Terceros</option>
                <option value="reports">Reportes & Finanzas</option>
                <option value="users">Personal & Roles RBAC</option>
                <option value="support">Mesa de Soporte</option>
                <option value="settings">Configuración & Marca</option>
              </select>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white uppercase text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4 w-44 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                    Módulo
                  </th>
                  <th className="py-3 px-4 w-60 border-r border-slate-800">Permiso Granular & Slug</th>
                  <th className="py-3 px-4 border-r border-slate-800">Descripción Funcional</th>
                  {roles.map((r) => (
                    <th key={r.id} className="py-3 px-4 text-center border-r border-slate-800 min-w-32">
                      <div className="font-bold text-white leading-tight">{r.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {users.filter((u) => u.roleId === r.id).length} usuario(s)
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatrixPermissions.map((perm) => {
                  const meta = moduleMeta[perm.module];
                  const Icon = meta?.icon || Layers;

                  return (
                    <tr key={perm.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Module column */}
                      <td className="py-2.5 px-4 font-bold text-slate-800 border-r border-slate-100 sticky left-0 bg-white z-10">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-3.5 h-3.5 ${meta?.color?.split(' ')[0] || 'text-slate-500'}`} />
                          <span className="truncate">{meta?.name || perm.module}</span>
                        </div>
                      </td>

                      {/* Permission label & slug */}
                      <td className="py-2.5 px-4 border-r border-slate-100">
                        <div className="flex items-center space-x-2">
                          {getActionBadge(perm.action)}
                          <span className="font-semibold text-slate-900">{perm.label}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{perm.slug}</div>
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-4 text-slate-600 text-[11px] border-r border-slate-100">
                        {perm.description}
                      </td>

                      {/* Role Checkboxes */}
                      {roles.map((r) => {
                        const rolePerms = db.getPermissionsForRole(r.id);
                        const isGranted = rolePerms.includes(perm.slug);

                        return (
                          <td key={r.id} className="py-2.5 px-4 text-center border-r border-slate-100">
                            <button
                              onClick={() => handleToggleMatrixPermission(r.id, perm.slug)}
                              className={`p-1.5 rounded-lg transition-all ${
                                isGranted
                                  ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                                  : 'bg-slate-100 text-slate-300 hover:text-slate-600 hover:bg-slate-200'
                              }`}
                              title={`${isGranted ? 'Revocar' : 'Conceder'} "${perm.label}" al rol "${r.name}"`}
                            >
                              {isGranted ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE USER MODAL */}
      {/* ========================================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Empleado</h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contraseña Inicial * (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Rol Asignado * <span className="text-[11px] text-emerald-600 font-normal">(Obligatorio)</span>
                </label>
                <select
                  required
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-medium"
                >
                  <option value="" disabled>Selecciona el rol obligatorio...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.description || 'Sin descripción'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  El rol determina de manera estricta los permisos granulares asignados al empleado.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentTenant.primaryColor || '#0f172a' }}
                >
                  Guardar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT USER MODAL */}
      {/* ========================================================================= */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Editar Empleado</h3>
              <button onClick={() => setEditUser(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Rol Asignado *</label>
                <select
                  required
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-medium"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentTenant.primaryColor || '#0f172a' }}
                >
                  Actualizar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Restablecer Contraseña</h3>
              <button onClick={() => setResetUser(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Ingresa la nueva contraseña para <strong>{resetUser.name}</strong> ({resetUser.email}).
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nueva Contraseña (mínimo 6)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentTenant.primaryColor || '#0f172a' }}
                >
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROLE PERMISSION MATRIX MODAL */}
      {/* ========================================================================= */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingRoleId ? 'Configuración de Rol & Matriz de Permisos' : 'Crear Nuevo Rol Personalizado'}
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona exactamente los permisos que los empleados con este rol tendrán habilitados.
                </p>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre del Rol *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Ej. Cajero Principal / Supervisor"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Descripción Funcional</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Atención en caja, facturación e inventario..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Permisos Granulares por Módulo ({selectedPermSlugs.length}/{SYSTEM_PERMISSIONS.length} seleccionados):
                  </h4>
                  <div className="space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedPermSlugs(SYSTEM_PERMISSIONS.map((p) => p.slug))}
                      className="text-emerald-600 hover:underline font-bold"
                    >
                      Marcar Todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPermSlugs([])}
                      className="text-rose-600 hover:underline font-bold"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(permissionsByModule).map(([moduleKey, permList]) => {
                    const meta = moduleMeta[moduleKey];
                    const Icon = meta?.icon || Layers;
                    const selectedCount = permList.filter((p) => selectedPermSlugs.includes(p.slug)).length;

                    return (
                      <div
                        key={moduleKey}
                        className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon className={`w-4 h-4 ${meta?.color?.split(' ')[0] || 'text-slate-600'}`} />
                            <h5 className="text-xs font-bold text-slate-900">
                              {meta?.name || moduleKey}
                            </h5>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold">
                              {selectedCount}/{permList.length}
                            </span>
                          </div>

                          <div className="space-x-2 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setModulePermissions(moduleKey, true)}
                              className="text-emerald-700 hover:underline font-semibold"
                            >
                              Todo el módulo
                            </button>
                            <span>|</span>
                            <button
                              type="button"
                              onClick={() => setModulePermissions(moduleKey, false)}
                              className="text-slate-500 hover:underline font-semibold"
                            >
                              Ninguno
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {permList.map((perm) => {
                            const isChecked = selectedPermSlugs.includes(perm.slug);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start space-x-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-white border-slate-300 shadow-xs'
                                    : 'bg-white/40 border-slate-200/60 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermissionSlug(perm.slug)}
                                  className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold text-slate-900 leading-tight">
                                      {perm.label}
                                    </div>
                                    {getActionBadge(perm.action)}
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                                    {perm.description}
                                  </p>
                                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                                    {perm.slug}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentTenant.primaryColor || '#0f172a' }}
                >
                  Guardar Matriz de Rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
