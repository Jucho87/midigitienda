# Sincronización e Integración de MiDigiTienda desde GitHub

Sincronizar e integrar en el proyecto local la última versión del repositorio GitHub (`https://github.com/Jucho87/midigitienda.git`), incorporando el backend API REST completo de Next.js, autenticación con NextAuth v5, panel de Super Administrador de plataforma, gestión de divisas y planes de suscripción.

### User Review & Critical Decisions

> [!IMPORTANT]
> En la última versión del repositorio de GitHub (`commit b094c2e: feat: actualización completa del proyecto MiDigiTienda`), el archivo `package.json` fue omitido accidentalmente al realizar el commit. 
> Conservaremos y actualizaremos el `package.json` base del proyecto instalando las dependencias requeridas por el nuevo código (`next-auth`, `bcryptjs`, `@prisma/client`, `prisma`), asegurando que la aplicación compile sin roturas.

- **Estrategia de Base de Datos y Persistencia**: El nuevo código incluye soporte para Prisma ORM con Postgres y un almacén híbrido con fallback en memoria/API (`/api/bootstrap`). Esto permite que la aplicación funcione inmediatamente en modo autónomo y resiliente, conectándose a base de datos relacional cuando se configure `DATABASE_URL`.
- **Nuevos Módulos de Plataforma**: Se integran dos nuevas vistas de nivel Super Admin: `/empresas` (Gestión de Tenants) y `/planes` (Configuración de precios y cuotas SaaS), además de Login/Signup dedicados.

---

### 1. Overview & Core Concept

- **Qué hace**: Integra los cambios más recientes del repositorio de GitHub `Jucho87/midigitienda`, transformando la aplicación en una plataforma SaaS ERP/POS completa con arquitectura de dos niveles:
  1. **Nivel Tenant (Comercio)**: POS táctil, gestión de inventario y stock, historial de órdenes con comprobante térmico, finanzas, empleados, tickets de soporte y configuración white-label.
  2. **Nivel Super Administrador de Plataforma**: Monitoreo de todas las empresas registradas, alternar entre tenants en vivo, gestión de planes de suscripción y control de catálogo de monedas.
- **Público Objetivo**: Dueños de pequeños/medianos comercios y cajeros en el punto de venta, así como administradores de la plataforma SaaS.
- **Valor Clave**: Acceso unificado, arquitectura modular Next.js App Router con endpoints API REST para cada entidad y autenticación real.

---

### 2. User Experience & Visual Design

Siguiendo las pautas de diseño `frontend-design` y `references/3_saas_dashboard.md`:

- **Flujos de Usuario**:
  - **Acceso y Autenticación**: Pantallas de Login y Registro (`/login`, `/signup`) limpias, sin tarjetas anidadas ni elementos superfluos.
  - **Experiencia de Caja (POS)**: Catálogo rápido con buscador y lector de código de barras, cálculo de vuelto en efectivo y emisión de ticket térmico 80mm.
  - **Panel de Super Admin**: Vistas dedicadas para inspeccionar todas las empresas (`/empresas`) y gestionar planes (`/planes`), con tablas de alta densidad y números tabulares (`tabular-nums`).
- **Identidad Visual & Branding**:
  - **Paleta y Contraste**: Distribución 60-30-10 con lienzo neutro en pizarra suave (`#f8fafc`), superficies de tarjeta con bordes tenues (`border border-slate-200`) y acento primario dinámico inyectado por negocio (`--primary-color`).
  - **Tipografía y Jerarquía**: Display y encabezados con escala tipográfica limpia; todas las cifras monetarias, códigos de barras y números en tablas formateados con `font-mono tabular-nums`.
  - **Disciplina Anti-Slop**: Cero píldoras decorativas innecesarias, cero puntos parpadeantes ornamentales, sin encabezados con comentarios de código (`//`) y controles de una sola línea (`whitespace-nowrap`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Fusión y Preservación de Archivos Esenciales de Configuración**:
  - *Enfoque*: Copiar los nuevos directorios y módulos (`app/api`, `app/login`, `app/signup`, `app/empresas`, `app/planes`, `views/admin`, `lib`, `prisma`, `auth.ts`, `services/db.ts`) desde `/tmp/midigitienda` mientras se mantiene y actualiza `package.json` con las dependencias exactas (`next-auth`, `bcryptjs`, `@types/bcryptjs`, `@prisma/client`).
  - *Por qué*: Evita que la falta de `package.json` en el commit de GitHub rompa el entorno de ejecución.
- **Decisión 2: Arquitectura Híbrida de Datos (API + Optimistic Client Store)**:
  - *Enfoque*: Adoptar el nuevo `services/db.ts` de GitHub que lee de `/api/bootstrap` y realiza mutaciones asíncronas hacia el backend REST, manteniendo respuesta inmediata en la interfaz.
  - *Por qué*: Garantiza que las vistas sigan siendo ultra-rápidas en el POS sin latencia de red en cada pulsación.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router                              │
├──────────────────────────┬─────────────────────────────────────────────┤
│   Rutas de Vista (UI)    │           API Routes (Backend REST)         │
│   ├── /login, /signup    │   ├── /api/auth/[...nextauth]               │
│   ├── /pos               │   ├── /api/bootstrap (hidratación global)   │
│   ├── /inventory         │   ├── /api/products, /api/orders            │
│   ├── /orders            │   ├── /api/tenants, /api/subscription       │
│   ├── /reports           │   ├── /api/admin/overview, /tenants, /plans │
│   ├── /empresas, /planes │   └── /api/tickets, /api/users, /currencies │
│   └── /settings          │                                             │
└────────────┬─────────────┴──────────────────────┬──────────────────────┘
             │                                    │
             ▼                                    ▼
┌──────────────────────────┐             ┌───────────────────────────────┐
│   services/db.ts         │  Sincroniza │   lib/db.ts (Prisma Client)   │
│   (Caché optimista local │◄────────────┤   + Resilient in-memory store │
│    hidratada vía API)    │             │   si DATABASE_URL no está fija│
└──────────────────────────┘             └───────────────────────────────┘
```

- **Entidades Principales**: `Tenant`, `User`, `Role`, `Permission`, `Product`, `Order`, `OrderItem`, `TenantSubscription`, `Plan`, `Currency`, `SupportTicket`, `Notification`.
- **Estrategia de Verificación**:
  1. Migración de archivos de `/tmp/midigitienda` a la raíz del proyecto.
  2. Instalación de dependencias `next-auth`, `bcryptjs`, `@types/bcryptjs`, `@prisma/client`.
  3. Ejecución de `lint_applet` y `compile_applet` para confirmar build sin errores.
