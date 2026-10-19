import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ensurePermissions, provisionTenant } from '../lib/provision';

const prisma = new PrismaClient();

async function main() {
  // Asegura que el catálogo global de permisos exista
  await ensurePermissions();

  // Cuenta de prueba aislada (no se muestra al usuario final)
  const testEmail = 'abacus-b00a8a1c@example.com';
  const existing = await prisma.user.findUnique({ where: { email: testEmail } });

  if (!existing) {
    const plain = process.env.SEED_TEST_PASSWORD;
    if (!plain) {
      console.log('Seed: SEED_TEST_PASSWORD no definido, se omite la cuenta de prueba.');
      return;
    }
    const passwordHash = await bcrypt.hash(plain, 10);
    await provisionTenant({
      businessName: 'Tienda Demo',
      adminName: 'Administrador',
      email: testEmail,
      passwordHash,
      currencyCode: 'PEN',
    });
    console.log('Seed: cuenta de prueba creada.');
  } else {
    console.log('Seed: la cuenta de prueba ya existe, nada que hacer.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
