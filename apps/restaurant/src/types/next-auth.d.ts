import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    organizationId: string;
    restaurantId: string;
    employeeId: string;
    employeeRole: string;
    restCode: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string;
      organizationId: string;
      restaurantId: string;
      employeeId: string;
      employeeRole: string;
      restCode: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    tenantId: string;
    organizationId: string;
    restaurantId: string;
    employeeId: string;
    employeeRole: string;
    restCode: string;
  }
}
