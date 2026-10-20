'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { User, Role, Permission } from '../../types';
import { SYSTEM_PERMISSIONS } from '../../services/seedData';
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
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { currentTenant, hasPermission, refreshState, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('');

  // Role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermSlugs, setSelectedPermSlugs] = useState<string[]>([]);

  const loadData = () => {
    setUsers(db.getUsers(currentTenant.id));
    const rList = db.getRoles(currentTenant.id);
    setRoles(rList);
    if (rList.length > 0 && !newUserRole) {
      setNewUserRole(rList[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenant.id]);

  if (!hasPermission('users.manage')) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200">
        <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-base">Permiso Insuficiente (403 Forbidden)</h3>
        <p className="text-xs text-slate-500 mt-1">
          Solo los administradores con el permiso <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">users.manage</code> pueden gestionar cuentas de personal y la matriz de permisos RBAC.
        </p>
      </div>
    );
  }

  // Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      db.createUser(currentTenant.id, {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        roleId: newUserRole,
      });
      setShowUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      loadData();
      refreshState();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al registrar el empleado');
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

  // Change user role
  const handleChangeUserRole = (userId: string, roleId: string) => {
    db.updateUser(currentTenant.id, userId, { roleId });
    loadData();
    refreshState();
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
      setSelectedPermSlugs(['products.read', 'orders.create', 'orders.read']);
    }
    setShowRoleModal(true);
  };

  // Toggle permission checkbox
  const togglePermissionSlug = (slug: string) => {
    setSelectedPermSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
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
    if (confirm(`¿Estás seguro de eliminar el rol "${r.name}"? Los usuarios asignados perderán sus accesos asociados.`)) {
      try {
        db.deleteRole(currentTenant.id, r.id);
        loadData();
        refreshState();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Error al eliminar el rol');
      }
    }
  };

  // Group permissions by module
  const permissionsByModule = SYSTEM_PERMISSIONS.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  const moduleNames: Record<string, string> = {
    products: 'Inventario & Catálogo',
    orders: 'Punto de Venta & Pedidos',
    reports: 'Reportes Financieros',
    users: 'Personal & Roles RBAC',
    support: 'Mesa de Soporte',
    settings: 'Configuración & Branding',
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Control de Acceso y Personal (RBAC)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración de empleados, roles dinámicos y matriz relacional de permisos atómicos
          </p>
        </div>

        {/* Action Button */}
        {activeTab === 'users' ? (
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity self-start"
            style={{ backgroundColor: currentTenant.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Empleado</span>
          </button>
        ) : (
          <button
            onClick={() => handleOpenRoleModal()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity self-start"
            style={{ backgroundColor: currentTenant.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Rol Personalizado</span>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          style={activeTab === 'users' ? { borderColor: currentTenant.primaryColor, color: currentTenant.primaryColor } : {}}
        >
          <UsersIcon className="w-4 h-4" />
          <span>Equipo y Empleados ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center space-x-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'roles'
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
          style={activeTab === 'roles' ? { borderColor: currentTenant.primaryColor, color: currentTenant.primaryColor } : {}}
        >
          <Shield className="w-4 h-4" />
          <span>Roles & Matriz de Permisos ({roles.length})</span>
        </button>
      </div>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Empleado / Nombre</th>
                <th className="py-3.5 px-4">Correo Electrónico</th>
                <th className="py-3.5 px-4">Rol Asignado</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const role = roles.find((r) => r.id === u.roleId);
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md">
                                Tú
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>

                    <td className="py-3.5 px-4">
                      <select
                        value={u.roleId || ''}
                        onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700"
                      >
                        <option value="">Sin Rol Asignado</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        disabled={isCurrent}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                          u.isActive
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                        title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ROLES TAB */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r) => {
              const perms = db.getPermissionsForRole(r.id);
              const assignedCount = users.filter((u) => u.roleId === r.id).length;

              return (
                <div
                  key={r.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          {r.isSystem ? 'Rol Base del Sistema' : 'Rol Personalizado'}
                        </span>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {assignedCount} usuarios
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {r.description || 'Sin descripción'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Permisos Concedidos ({perms.length}/{SYSTEM_PERMISSIONS.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {perms.slice(0, 6).map((slug) => (
                          <span
                            key={slug}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono"
                          >
                            {slug}
                          </span>
                        ))}
                        {perms.length > 6 && (
                          <span className="text-[10px] text-slate-400 font-bold self-center">
                            +{perms.length - 6} más
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleOpenRoleModal(r)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Configurar Matriz</span>
                    </button>

                    {!r.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Eliminar Rol"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Registrar Nuevo Empleado</h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 text-slate-400">
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
                  placeholder="Ej. Roberto Sánchez"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="roberto@comercio.com"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Rol Inicial</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
                  style={{ backgroundColor: currentTenant.primaryColor }}
                >
                  Guardar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE PERMISSION MATRIX MODAL */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingRoleId ? 'Configuración de Rol y Permisos' : 'Crear Nuevo Rol'}
                </h3>
                <p className="text-xs text-slate-500">
                  Activa o desactiva permisos específicos para este rol
                </p>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre del Rol *</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Ej. Supervisor de Sucursal"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Descripción</label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Responsable de caja y turnos..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Matriz de Permisos Atómicos (Slug por Vista y Acción):
                  </h4>
                  <div className="space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedPermSlugs(SYSTEM_PERMISSIONS.map((p) => p.slug))}
                      className="text-emerald-600 hover:underline font-semibold"
                    >
                      Seleccionar Todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPermSlugs([])}
                      className="text-rose-600 hover:underline font-semibold"
                    >
                      Deseleccionar
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(permissionsByModule).map(([moduleKey, permList]) => (
                    <div
                      key={moduleKey}
                      className="bg-slate-50 p-3.5 rounded-xl border border-slate-200"
                    >
                      <h5 className="text-xs font-bold text-slate-800 mb-2">
                        {moduleNames[moduleKey] || moduleKey}
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {permList.map((perm) => {
                          const isChecked = selectedPermSlugs.includes(perm.slug);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start space-x-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-white border-slate-300 shadow-xs'
                                  : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermissionSlug(perm.slug)}
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="flex-1">
                                <div className="font-semibold text-slate-800 leading-tight">
                                  {perm.label}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  {perm.slug}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
                  style={{ backgroundColor: currentTenant.primaryColor }}
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
