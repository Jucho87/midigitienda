// Migración puntual: (1) asegura el catálogo de permisos y los asigna a todos los roles
// de administrador del sistema; (2) marca al super administrador de la plataforma.
// Ejecutar: yarn tsx --require dotenv/config scripts/migrate-platform-admin.ts
import { PrismaClient } from '@prisma/client';
import { ensurePermissions } from '../lib/provision';

const prisma = new PrismaClient();
const PLATFORM_ADMIN_EMAIL = 'admin@midigitienda.com';

async function main() {
  await ensurePermissions();
  const allPermissions = await prisma.permission.findMany();

  // Dar TODOS los permisos (incluidos los nuevos) a los roles de administrador del sistema.
  const systemAdminRoles = await prisma.role.findMany({ where: { isSystem: true } });
  for (const role of systemAdminRoles) {
    const existing = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
    const existingIds = new Set(existing.map((e) => e.permissionId));
    const toAdd = allPermissions.filter((p) => !existingIds.has(p.id));
    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
      console.log(`Rol ${role.name} (${role.id}): +${toAdd.length} permisos`);
    }
  }

  // Marcar al super administrador transversal.
  const admin = await prisma.user.findUnique({ where: { email: PLATFORM_ADMIN_EMAIL } });
  if (admin) {
    await prisma.user.update({ where: { id: admin.id }, data: { isPlatformAdmin: true } });
    console.log(`Usuario ${PLATFORM_ADMIN_EMAIL} marcado como super administrador.`);
  } else {
    console.warn(`No se encontró ${PLATFORM_ADMIN_EMAIL}; omitiendo marca de super admin.`);
  }
}

main()
  .then(() => console.log('Migración completada.'))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
