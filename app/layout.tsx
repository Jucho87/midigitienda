import './globals.css';
import { ClientProviders } from './ClientProviders';

export const metadata = {
  title: 'MiDigiTienda | Gestión Comercial ERP/POS',
  description:
    'Software de gestión comercial por suscripción con POS rápido, inventario, permisos RBAC, branding dinámico y soporte.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'MiDigiTienda | ERP/POS Multi-Tenant',
    description:
      'Software de gestión comercial por suscripción para comercios y puntos de venta.',
    type: 'website',
    images: [{ url: '/og-image.png' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
      </head>
      <body className="font-sans">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
