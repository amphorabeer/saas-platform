
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  email: 'email',
  phone: 'phone',
  address: 'address',
  logo: 'logo',
  company: 'company',
  taxId: 'taxId',
  city: 'city',
  country: 'country',
  website: 'website',
  bankName: 'bankName',
  bankAccount: 'bankAccount',
  tenantId: 'tenantId',
  hotelCode: 'hotelCode',
  storeCode: 'storeCode',
  databaseUrl: 'databaseUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  password: 'password',
  avatar: 'avatar',
  emailVerified: 'emailVerified',
  lastLoginAt: 'lastLoginAt',
  organizationId: 'organizationId',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoreScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  slug: 'slug',
  address: 'address',
  phone: 'phone',
  email: 'email',
  taxId: 'taxId',
  currency: 'currency',
  timezone: 'timezone',
  logoUrl: 'logoUrl',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoreEmployeeScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  userId: 'userId',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  email: 'email',
  role: 'role',
  pin: 'pin',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductCategoryScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  name: 'name',
  nameKa: 'nameKa',
  slug: 'slug',
  description: 'description',
  color: 'color',
  icon: 'icon',
  sortOrder: 'sortOrder',
  parentId: 'parentId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoreProductScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  categoryId: 'categoryId',
  sku: 'sku',
  barcode: 'barcode',
  name: 'name',
  nameKa: 'nameKa',
  description: 'description',
  imageUrl: 'imageUrl',
  costPrice: 'costPrice',
  sellingPrice: 'sellingPrice',
  wholesalePrice: 'wholesalePrice',
  currentStock: 'currentStock',
  minStock: 'minStock',
  maxStock: 'maxStock',
  unit: 'unit',
  taxRuleId: 'taxRuleId',
  isActive: 'isActive',
  isFavorite: 'isFavorite',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StorePriceHistoryScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  costPrice: 'costPrice',
  sellingPrice: 'sellingPrice',
  changedBy: 'changedBy',
  changedAt: 'changedAt'
};

exports.Prisma.SaleScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  saleNumber: 'saleNumber',
  customerId: 'customerId',
  employeeId: 'employeeId',
  subtotal: 'subtotal',
  taxAmount: 'taxAmount',
  discountAmount: 'discountAmount',
  discountType: 'discountType',
  total: 'total',
  paidAmount: 'paidAmount',
  changeAmount: 'changeAmount',
  status: 'status',
  notes: 'notes',
  receiptPrinted: 'receiptPrinted',
  fiscalPrinted: 'fiscalPrinted',
  fiscalNumber: 'fiscalNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SaleItemScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  productId: 'productId',
  productName: 'productName',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  costPrice: 'costPrice',
  discount: 'discount',
  taxAmount: 'taxAmount',
  total: 'total'
};

exports.Prisma.SalePaymentScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  method: 'method',
  amount: 'amount',
  reference: 'reference',
  createdAt: 'createdAt'
};

exports.Prisma.SaleReturnScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  reason: 'reason',
  refundAmount: 'refundAmount',
  refundMethod: 'refundMethod',
  status: 'status',
  createdAt: 'createdAt',
  processedAt: 'processedAt'
};

exports.Prisma.SaleReturnItemScalarFieldEnum = {
  id: 'id',
  returnId: 'returnId',
  productId: 'productId',
  quantity: 'quantity',
  refundAmount: 'refundAmount'
};

exports.Prisma.StoreSupplierScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  name: 'name',
  contactPerson: 'contactPerson',
  phone: 'phone',
  email: 'email',
  address: 'address',
  taxId: 'taxId',
  bankAccount: 'bankAccount',
  notes: 'notes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StorePurchaseOrderScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  supplierId: 'supplierId',
  orderNumber: 'orderNumber',
  subtotal: 'subtotal',
  taxAmount: 'taxAmount',
  total: 'total',
  status: 'status',
  notes: 'notes',
  expectedDate: 'expectedDate',
  receivedDate: 'receivedDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StorePurchaseItemScalarFieldEnum = {
  id: 'id',
  purchaseOrderId: 'purchaseOrderId',
  productId: 'productId',
  quantity: 'quantity',
  unitCost: 'unitCost',
  receivedQty: 'receivedQty',
  total: 'total'
};

exports.Prisma.StockMovementScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  productId: 'productId',
  type: 'type',
  quantity: 'quantity',
  previousStock: 'previousStock',
  newStock: 'newStock',
  reason: 'reason',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  performedBy: 'performedBy',
  createdAt: 'createdAt'
};

exports.Prisma.TransferOrderScalarFieldEnum = {
  id: 'id',
  fromStoreId: 'fromStoreId',
  toStoreId: 'toStoreId',
  transferNumber: 'transferNumber',
  status: 'status',
  notes: 'notes',
  sentAt: 'sentAt',
  receivedAt: 'receivedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransferOrderItemScalarFieldEnum = {
  id: 'id',
  transferOrderId: 'transferOrderId',
  productId: 'productId',
  quantity: 'quantity',
  unitCost: 'unitCost'
};

exports.Prisma.StoreCustomerScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  email: 'email',
  address: 'address',
  taxId: 'taxId',
  notes: 'notes',
  totalPurchases: 'totalPurchases',
  loyaltyPoints: 'loyaltyPoints',
  loyaltyTier: 'loyaltyTier',
  totalLifetimePurchases: 'totalLifetimePurchases',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoreLoyaltyConfigScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  pointsPerGel: 'pointsPerGel',
  redemptionRate: 'redemptionRate',
  minRedemptionPoints: 'minRedemptionPoints',
  expirationDays: 'expirationDays',
  bronzeMinSpend: 'bronzeMinSpend',
  silverMinSpend: 'silverMinSpend',
  goldMinSpend: 'goldMinSpend',
  platinumMinSpend: 'platinumMinSpend',
  goldDiscountPercent: 'goldDiscountPercent',
  platinumDiscountPercent: 'platinumDiscountPercent'
};

exports.Prisma.StoreLoyaltyTransactionScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  type: 'type',
  points: 'points',
  saleId: 'saleId',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.StoreTaxRuleScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  name: 'name',
  rate: 'rate',
  isDefault: 'isDefault',
  isActive: 'isActive'
};

exports.Prisma.StorePaymentConfigScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  name: 'name',
  type: 'type',
  isActive: 'isActive',
  sortOrder: 'sortOrder'
};

exports.Prisma.StoreReceiptConfigScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  headerText: 'headerText',
  footerText: 'footerText',
  showLogo: 'showLogo',
  showTaxId: 'showTaxId',
  showBarcode: 'showBarcode',
  paperWidth: 'paperWidth'
};

exports.Prisma.StoreDeviceConfigScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  deviceType: 'deviceType',
  name: 'name',
  connectionType: 'connectionType',
  settings: 'settings',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StoreIntegrationScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  type: 'type',
  name: 'name',
  credentials: 'credentials',
  settings: 'settings',
  lastSyncAt: 'lastSyncAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.StoreDiscountType = exports.$Enums.StoreDiscountType = {
  DISCOUNT_PERCENTAGE: 'DISCOUNT_PERCENTAGE',
  DISCOUNT_FIXED: 'DISCOUNT_FIXED'
};

exports.StoreSaleStatus = exports.$Enums.StoreSaleStatus = {
  COMPLETED: 'COMPLETED',
  VOIDED: 'VOIDED',
  REFUNDED: 'REFUNDED',
  PARTIAL_REFUND: 'PARTIAL_REFUND'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD: 'CARD',
  CHECK: 'CHECK'
};

exports.StoreReturnStatus = exports.$Enums.StoreReturnStatus = {
  STORE_RETURN_PENDING: 'STORE_RETURN_PENDING',
  STORE_RETURN_APPROVED: 'STORE_RETURN_APPROVED',
  STORE_RETURN_COMPLETED: 'STORE_RETURN_COMPLETED',
  STORE_RETURN_REJECTED: 'STORE_RETURN_REJECTED'
};

exports.StorePurchaseStatus = exports.$Enums.StorePurchaseStatus = {
  STORE_PO_DRAFT: 'STORE_PO_DRAFT',
  STORE_PO_ORDERED: 'STORE_PO_ORDERED',
  STORE_PO_PARTIAL: 'STORE_PO_PARTIAL',
  STORE_PO_RECEIVED: 'STORE_PO_RECEIVED',
  STORE_PO_CANCELLED: 'STORE_PO_CANCELLED'
};

exports.StoreMovementType = exports.$Enums.StoreMovementType = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT',
  STOCK_TRANSFER: 'STOCK_TRANSFER',
  STOCK_RETURN: 'STOCK_RETURN'
};

exports.TransferOrderStatus = exports.$Enums.TransferOrderStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  RECEIVED: 'RECEIVED'
};

exports.LoyaltyTier = exports.$Enums.LoyaltyTier = {
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM'
};

exports.LoyaltyTransactionType = exports.$Enums.LoyaltyTransactionType = {
  EARN: 'EARN',
  REDEEM: 'REDEEM',
  ADJUST: 'ADJUST',
  EXPIRE: 'EXPIRE'
};

exports.StoreDeviceType = exports.$Enums.StoreDeviceType = {
  RECEIPT_PRINTER: 'RECEIPT_PRINTER',
  FISCAL_PRINTER: 'FISCAL_PRINTER',
  BARCODE_SCANNER: 'BARCODE_SCANNER',
  WEIGHT_SCALE: 'WEIGHT_SCALE',
  CASH_DRAWER: 'CASH_DRAWER',
  BANK_TERMINAL: 'BANK_TERMINAL',
  CUSTOMER_DISPLAY: 'CUSTOMER_DISPLAY'
};

exports.StoreIntegrationType = exports.$Enums.StoreIntegrationType = {
  RS_GE: 'RS_GE',
  WOOCOMMERCE: 'WOOCOMMERCE',
  SHOPIFY: 'SHOPIFY',
  GLOVO: 'GLOVO',
  EXTRA_GE: 'EXTRA_GE',
  BANK_TBC: 'BANK_TBC',
  BANK_BOG: 'BANK_BOG',
  BANK_LIBERTY: 'BANK_LIBERTY'
};

exports.Prisma.ModelName = {
  Organization: 'Organization',
  User: 'User',
  Store: 'Store',
  StoreEmployee: 'StoreEmployee',
  ProductCategory: 'ProductCategory',
  StoreProduct: 'StoreProduct',
  StorePriceHistory: 'StorePriceHistory',
  Sale: 'Sale',
  SaleItem: 'SaleItem',
  SalePayment: 'SalePayment',
  SaleReturn: 'SaleReturn',
  SaleReturnItem: 'SaleReturnItem',
  StoreSupplier: 'StoreSupplier',
  StorePurchaseOrder: 'StorePurchaseOrder',
  StorePurchaseItem: 'StorePurchaseItem',
  StockMovement: 'StockMovement',
  TransferOrder: 'TransferOrder',
  TransferOrderItem: 'TransferOrderItem',
  StoreCustomer: 'StoreCustomer',
  StoreLoyaltyConfig: 'StoreLoyaltyConfig',
  StoreLoyaltyTransaction: 'StoreLoyaltyTransaction',
  StoreTaxRule: 'StoreTaxRule',
  StorePaymentConfig: 'StorePaymentConfig',
  StoreReceiptConfig: 'StoreReceiptConfig',
  StoreDeviceConfig: 'StoreDeviceConfig',
  StoreIntegration: 'StoreIntegration'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
