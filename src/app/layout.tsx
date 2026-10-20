import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from './ClientProviders';

export const metadata: Metadata = {
  title: 'SaaS ERP/POS Multi-Tenant | Gestión Comercial',
  description:
    'Software de gestión comercial por suscripción con POS rápido, inventario, permisos RBAC, branding dinámico y soporte.',
  openGraph: {
    title: 'SaaS ERP/POS Multi-Tenant',
    description:
      'Software de gestión comercial por suscripción para comercios y puntos de venta.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
