export type StoreRole = "STORE_OWNER" | "STORE_MANAGER" | "STORE_CASHIER" | "STORE_INVENTORY_CLERK";

export type Resource =
  | "dashboard"
  | "pos"
  | "products"
  | "categories"
  | "inventory"
  | "purchases"
  | "suppliers"
  | "sales"
  | "returns"
  | "customers"
  | "reports"
  | "settings"
  | "employees"
  | "store"
  | "tax"
  | "payment"
  | "receipt"
  | "hardware"
  | "integrations"
  | "import"
  | "locations"
  | "loyalty";

export type Action = "view" | "create" | "edit" | "delete" | "void_sale" | "change_price";

const RBAC: Record<StoreRole, Partial<Record<Resource, Action[]>>> = {
  STORE_OWNER: {
    dashboard: ["view"],
    pos: ["view", "create", "edit", "void_sale", "change_price"],
    products: ["view", "create", "edit", "delete"],
    categories: ["view", "create", "edit", "delete"],
    inventory: ["view", "create", "edit"],
    purchases: ["view", "create", "edit", "delete"],
    suppliers: ["view", "create", "edit", "delete"],
    sales: ["view", "create", "edit", "delete", "void_sale"],
    returns: ["view", "create", "edit"],
    customers: ["view", "create", "edit", "delete"],
    reports: ["view"],
    settings: ["view", "create", "edit", "delete"],
    employees: ["view", "create", "edit", "delete"],
    store: ["view", "create", "edit", "delete"],
    locations: ["view", "create", "edit", "delete"],
    loyalty: ["view", "create", "edit"],
    tax: ["view", "create", "edit", "delete"],
    payment: ["view", "create", "edit", "delete"],
    receipt: ["view", "create", "edit"],
    hardware: ["view", "create", "edit", "delete"],
    integrations: ["view", "create", "edit"],
    import: ["view"],
  },
  STORE_MANAGER: {
    dashboard: ["view"],
    pos: ["view", "create", "edit", "void_sale", "change_price"],
    products: ["view", "create", "edit"],
    categories: ["view", "create", "edit"],
    inventory: ["view", "create", "edit"],
    purchases: ["view", "create", "edit"],
    suppliers: ["view", "create", "edit"],
    sales: ["view", "create", "edit", "void_sale"],
    returns: ["view", "create", "edit"],
    customers: ["view", "create", "edit"],
    reports: ["view"],
    settings: ["view", "create", "edit"],
    employees: ["view", "create", "edit"],
    store: ["view", "edit"],
    locations: ["view", "create", "edit", "delete"],
    loyalty: ["view", "create", "edit"],
    tax: ["view", "create", "edit", "delete"],
    payment: ["view", "create", "edit", "delete"],
    receipt: ["view", "create", "edit"],
    hardware: ["view", "create", "edit", "delete"],
    integrations: ["view", "create", "edit"],
    import: ["view"],
  },
  STORE_CASHIER: {
    dashboard: ["view"],
    pos: ["view", "create"],
    sales: ["view"],
    customers: ["view"],
    reports: ["view"], // Z რეპორტი (ცვლის დახურვა)
  },
  STORE_INVENTORY_CLERK: {
    dashboard: ["view"],
    products: ["view", "edit"],
    inventory: ["view", "create", "edit"],
    purchases: ["view", "create"],
    suppliers: ["view"],
  },
};

export function canAccess(role: StoreRole, resource: Resource, action: Action): boolean {
  const allowed = RBAC[role]?.[resource];
  if (!allowed) return false;
  return allowed.includes(action);
}

export function canAccessRoute(role: StoreRole, pathname: string): boolean {
  const routeMap: Record<string, Resource> = {
    "/": "dashboard",
    "/dashboard": "dashboard",
    "/pos": "pos",
    "/products": "products",
    "/products/categories": "categories",
    "/inventory": "inventory",
    "/inventory/movements": "inventory",
    "/inventory/stock-take": "inventory",
    "/inventory/alerts": "inventory",
    "/purchases": "purchases",
    "/purchases/suppliers": "suppliers",
    "/sales": "sales",
    "/sales/returns": "returns",
    "/customers": "customers",
    "/reports": "reports",
    "/settings/store": "store",
    "/settings/tax": "tax",
    "/settings/tax-rules": "tax",
    "/settings/payment": "payment",
    "/settings/payment-methods": "payment",
    "/settings/receipt": "receipt",
    "/settings/hardware": "hardware",
    "/settings/integrations": "integrations",
    "/settings/employees": "employees",
    "/settings/import": "import",
    "/settings/locations": "locations",
    "/settings/loyalty": "loyalty",
  };
  for (const [path, resource] of Object.entries(routeMap)) {
    if (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/")) {
      return canAccess(role, resource, "view");
    }
  }
  return true;
}
