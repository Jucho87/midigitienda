import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      roleId?: string | null;
      isPlatformAdmin?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    tenantId: string;
    roleId?: string | null;
    isPlatformAdmin?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    tenantId: string;
    roleId?: string | null;
    isPlatformAdmin?: boolean;
  }
}
