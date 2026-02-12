
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

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  plan: 'plan',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  code: 'code',
  legalName: 'legalName',
  taxId: 'taxId',
  phone: 'phone',
  email: 'email',
  address: 'address',
  website: 'website',
  bankName: 'bankName',
  bankAccount: 'bankAccount',
  bankSwift: 'bankSwift'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  name: 'name',
  role: 'role',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  password: 'password',
  resetToken: 'resetToken',
  resetTokenExpiry: 'resetTokenExpiry'
};

exports.Prisma.RecipeScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  createdBy: 'createdBy',
  name: 'name',
  style: 'style',
  abv: 'abv',
  ibu: 'ibu',
  color: 'color',
  og: 'og',
  fg: 'fg',
  batchSize: 'batchSize',
  boilTime: 'boilTime',
  efficiency: 'efficiency',
  description: 'description',
  notes: 'notes',
  process: 'process',
  status: 'status',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  yeastStrain: 'yeastStrain'
};

exports.Prisma.RecipeIngredientScalarFieldEnum = {
  id: 'id',
  recipeId: 'recipeId',
  inventoryItemId: 'inventoryItemId',
  name: 'name',
  category: 'category',
  amount: 'amount',
  unit: 'unit',
  additionTime: 'additionTime',
  specs: 'specs'
};

exports.Prisma.InventoryItemScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  sku: 'sku',
  name: 'name',
  category: 'category',
  ingredientType: 'ingredientType',
  unit: 'unit',
  reorderPoint: 'reorderPoint',
  supplier: 'supplier',
  location: 'location',
  specs: 'specs',
  cachedBalance: 'cachedBalance',
  costPerUnit: 'costPerUnit',
  balanceUpdatedAt: 'balanceUpdatedAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryLedgerScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  itemId: 'itemId',
  quantity: 'quantity',
  type: 'type',
  batchId: 'batchId',
  orderId: 'orderId',
  packagingId: 'packagingId',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.IngredientCatalogScalarFieldEnum = {
  id: 'id',
  type: 'type',
  name: 'name',
  supplier: 'supplier',
  origin: 'origin',
  specs: 'specs',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BatchScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  batchNumber: 'batchNumber',
  recipeId: 'recipeId',
  status: 'status',
  volume: 'volume',
  packagedVolume: 'packagedVolume',
  originalGravity: 'originalGravity',
  currentGravity: 'currentGravity',
  finalGravity: 'finalGravity',
  abv: 'abv',
  tankId: 'tankId',
  plannedDate: 'plannedDate',
  brewedAt: 'brewedAt',
  fermentationStartedAt: 'fermentationStartedAt',
  conditioningStartedAt: 'conditioningStartedAt',
  readyAt: 'readyAt',
  completedAt: 'completedAt',
  createdBy: 'createdBy',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  targetOg: 'targetOg',
  fermentationTankId: 'fermentationTankId'
};

exports.Prisma.BatchIngredientScalarFieldEnum = {
  id: 'id',
  batchId: 'batchId',
  inventoryItemId: 'inventoryItemId',
  name: 'name',
  category: 'category',
  plannedAmount: 'plannedAmount',
  actualAmount: 'actualAmount',
  unit: 'unit',
  lotNumber: 'lotNumber',
  addedAt: 'addedAt'
};

exports.Prisma.GravityReadingScalarFieldEnum = {
  id: 'id',
  batchId: 'batchId',
  gravity: 'gravity',
  temperature: 'temperature',
  notes: 'notes',
  recordedBy: 'recordedBy',
  recordedAt: 'recordedAt'
};

exports.Prisma.BatchTimelineScalarFieldEnum = {
  id: 'id',
  batchId: 'batchId',
  type: 'type',
  title: 'title',
  description: 'description',
  data: 'data',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.TankScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  type: 'type',
  capacity: 'capacity',
  status: 'status',
  currentBatchId: 'currentBatchId',
  location: 'location',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  capabilities: 'capabilities',
  currentLotId: 'currentLotId',
  currentPhase: 'currentPhase',
  defaultTurnaroundHours: 'defaultTurnaroundHours',
  maxFillPercent: 'maxFillPercent',
  minFillPercent: 'minFillPercent'
};

exports.Prisma.TankOccupationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  tankId: 'tankId',
  batchId: 'batchId',
  phase: 'phase',
  startedAt: 'startedAt',
  endedAt: 'endedAt'
};

exports.Prisma.PackagingRunScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  batchId: 'batchId',
  packageType: 'packageType',
  quantity: 'quantity',
  volumeTotal: 'volumeTotal',
  lotNumber: 'lotNumber',
  performedBy: 'performedBy',
  notes: 'notes',
  performedAt: 'performedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  type: 'type',
  email: 'email',
  phone: 'phone',
  address: 'address',
  city: 'city',
  taxId: 'taxId',
  kegReturnDays: 'kegReturnDays',
  kegDepositRequired: 'kegDepositRequired',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupplierScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  category: 'category',
  email: 'email',
  phone: 'phone',
  address: 'address',
  city: 'city',
  taxId: 'taxId',
  bankAccount: 'bankAccount',
  notes: 'notes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalesOrderScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  orderNumber: 'orderNumber',
  customerId: 'customerId',
  status: 'status',
  paymentStatus: 'paymentStatus',
  totalAmount: 'totalAmount',
  paidAmount: 'paidAmount',
  notes: 'notes',
  orderedAt: 'orderedAt',
  shippedAt: 'shippedAt',
  deliveredAt: 'deliveredAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productName: 'productName',
  packageType: 'packageType',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalPrice: 'totalPrice',
  batchId: 'batchId'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  type: 'type',
  date: 'date',
  amount: 'amount',
  incomeCategory: 'incomeCategory',
  expenseCategory: 'expenseCategory',
  description: 'description',
  customerId: 'customerId',
  supplierId: 'supplierId',
  orderId: 'orderId',
  invoiceId: 'invoiceId',
  expenseId: 'expenseId',
  paymentId: 'paymentId',
  paymentMethod: 'paymentMethod',
  reference: 'reference',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  invoiceNumber: 'invoiceNumber',
  type: 'type',
  status: 'status',
  issueDate: 'issueDate',
  dueDate: 'dueDate',
  paidAt: 'paidAt',
  customerId: 'customerId',
  supplierId: 'supplierId',
  orderId: 'orderId',
  subtotal: 'subtotal',
  discount: 'discount',
  tax: 'tax',
  total: 'total',
  paidAmount: 'paidAmount',
  notes: 'notes',
  terms: 'terms',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceItemScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  description: 'description',
  quantity: 'quantity',
  unit: 'unit',
  unitPrice: 'unitPrice',
  total: 'total',
  productName: 'productName',
  packageType: 'packageType',
  batchId: 'batchId',
  sortOrder: 'sortOrder'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  invoiceId: 'invoiceId',
  orderId: 'orderId',
  amount: 'amount',
  method: 'method',
  date: 'date',
  reference: 'reference',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  category: 'category',
  supplierId: 'supplierId',
  amount: 'amount',
  date: 'date',
  description: 'description',
  invoiceNumber: 'invoiceNumber',
  invoiceId: 'invoiceId',
  isPaid: 'isPaid',
  paidAt: 'paidAt',
  paymentMethod: 'paymentMethod',
  receiptUrl: 'receiptUrl',
  notes: 'notes',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BudgetScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  category: 'category',
  year: 'year',
  month: 'month',
  amount: 'amount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  oldData: 'oldData',
  newData: 'newData',
  metadata: 'metadata',
  correlationId: 'correlationId',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.BlendingConfigScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  requireRecipeMatch: 'requireRecipeMatch',
  requireYeastMatch: 'requireYeastMatch',
  requirePhaseMatch: 'requirePhaseMatch',
  requireStyleMatch: 'requireStyleMatch',
  maxBlendSources: 'maxBlendSources',
  allowOverCapacity: 'allowOverCapacity',
  maxAgeDifferenceHours: 'maxAgeDifferenceHours',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CIPLogScalarFieldEnum = {
  id: 'id',
  equipmentId: 'equipmentId',
  cipType: 'cipType',
  date: 'date',
  duration: 'duration',
  temperature: 'temperature',
  causticConcentration: 'causticConcentration',
  performedBy: 'performedBy',
  result: 'result',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.EquipmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  type: 'type',
  status: 'status',
  capacity: 'capacity',
  model: 'model',
  manufacturer: 'manufacturer',
  serialNumber: 'serialNumber',
  location: 'location',
  workingPressure: 'workingPressure',
  currentTemp: 'currentTemp',
  currentPressure: 'currentPressure',
  installationDate: 'installationDate',
  warrantyDate: 'warrantyDate',
  lastCIP: 'lastCIP',
  nextCIP: 'nextCIP',
  lastMaintenance: 'lastMaintenance',
  nextMaintenance: 'nextMaintenance',
  cipIntervalDays: 'cipIntervalDays',
  inspectionIntervalDays: 'inspectionIntervalDays',
  annualMaintenanceDays: 'annualMaintenanceDays',
  currentBatchId: 'currentBatchId',
  currentBatchNumber: 'currentBatchNumber',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  purchaseDate: 'purchaseDate',
  capabilities: 'capabilities'
};

exports.Prisma.LotScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  lotCode: 'lotCode',
  phase: 'phase',
  status: 'status',
  plannedVolume: 'plannedVolume',
  actualVolume: 'actualVolume',
  notes: 'notes',
  parentLotId: 'parentLotId',
  splitRatio: 'splitRatio',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  completedAt: 'completedAt',
  lotNumber: 'lotNumber',
  blendedAt: 'blendedAt',
  isBlendResult: 'isBlendResult',
  splitAt: 'splitAt'
};

exports.Prisma.LotBatchScalarFieldEnum = {
  id: 'id',
  lotId: 'lotId',
  batchId: 'batchId',
  volumeContribution: 'volumeContribution',
  batchPercentage: 'batchPercentage',
  addedAt: 'addedAt'
};

exports.Prisma.LotReadingScalarFieldEnum = {
  id: 'id',
  lotId: 'lotId',
  tankId: 'tankId',
  readingType: 'readingType',
  value: 'value',
  unit: 'unit',
  notes: 'notes',
  recordedBy: 'recordedBy',
  recordedAt: 'recordedAt'
};

exports.Prisma.MaintenanceLogScalarFieldEnum = {
  id: 'id',
  equipmentId: 'equipmentId',
  type: 'type',
  status: 'status',
  priority: 'priority',
  scheduledDate: 'scheduledDate',
  completedDate: 'completedDate',
  duration: 'duration',
  performedBy: 'performedBy',
  cost: 'cost',
  partsUsed: 'partsUsed',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProblemReportScalarFieldEnum = {
  id: 'id',
  equipmentId: 'equipmentId',
  problemType: 'problemType',
  severity: 'severity',
  status: 'status',
  description: 'description',
  reportedDate: 'reportedDate',
  reportedBy: 'reportedBy',
  resolvedDate: 'resolvedDate',
  resolvedBy: 'resolvedBy',
  resolution: 'resolution',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TankAssignmentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  tankId: 'tankId',
  lotId: 'lotId',
  phase: 'phase',
  plannedStart: 'plannedStart',
  plannedEnd: 'plannedEnd',
  actualStart: 'actualStart',
  actualEnd: 'actualEnd',
  status: 'status',
  plannedVolume: 'plannedVolume',
  actualVolume: 'actualVolume',
  isBlendTarget: 'isBlendTarget',
  isSplitSource: 'isSplitSource',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  startTime: 'startTime',
  endTime: 'endTime',
  notes: 'notes'
};

exports.Prisma.TransferScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  transferCode: 'transferCode',
  sourceLotId: 'sourceLotId',
  sourceTankId: 'sourceTankId',
  destLotId: 'destLotId',
  destTankId: 'destTankId',
  transferType: 'transferType',
  volume: 'volume',
  plannedAt: 'plannedAt',
  executedAt: 'executedAt',
  status: 'status',
  measuredLoss: 'measuredLoss',
  lossReason: 'lossReason',
  performedBy: 'performedBy',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KegScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  kegNumber: 'kegNumber',
  size: 'size',
  status: 'status',
  condition: 'condition',
  batchId: 'batchId',
  filledAt: 'filledAt',
  productName: 'productName',
  lotNumber: 'lotNumber',
  customerId: 'customerId',
  orderId: 'orderId',
  sentAt: 'sentAt',
  returnedAt: 'returnedAt',
  deposit: 'deposit',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KegMovementScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  kegId: 'kegId',
  action: 'action',
  fromStatus: 'fromStatus',
  toStatus: 'toStatus',
  productId: 'productId',
  productName: 'productName',
  customerId: 'customerId',
  customerName: 'customerName',
  orderId: 'orderId',
  batchId: 'batchId',
  notes: 'notes',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.QCTestScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  batchId: 'batchId',
  lotId: 'lotId',
  testType: 'testType',
  status: 'status',
  priority: 'priority',
  scheduledDate: 'scheduledDate',
  completedDate: 'completedDate',
  minValue: 'minValue',
  maxValue: 'maxValue',
  targetValue: 'targetValue',
  result: 'result',
  unit: 'unit',
  notes: 'notes',
  performedBy: 'performedBy',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConfigurationScalarFieldEnum = {
  id: 'id',
  key: 'key',
  value: 'value',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt'
};

exports.Prisma.MuseumScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  city: 'city',
  address: 'address',
  nameEn: 'nameEn',
  descriptionEn: 'descriptionEn',
  cityEn: 'cityEn',
  addressEn: 'addressEn',
  nameRu: 'nameRu',
  descriptionRu: 'descriptionRu',
  cityRu: 'cityRu',
  addressRu: 'addressRu',
  nameDe: 'nameDe',
  descriptionDe: 'descriptionDe',
  cityDe: 'cityDe',
  addressDe: 'addressDe',
  nameFr: 'nameFr',
  descriptionFr: 'descriptionFr',
  cityFr: 'cityFr',
  addressFr: 'addressFr',
  slug: 'slug',
  coverImage: 'coverImage',
  latitude: 'latitude',
  longitude: 'longitude',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  website: 'website',
  showMap: 'showMap',
  showQrScanner: 'showQrScanner',
  isPublished: 'isPublished',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TourScalarFieldEnum = {
  id: 'id',
  museumId: 'museumId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
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
exports.PlanType = exports.$Enums.PlanType = {
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE'
};

exports.UserRole = exports.$Enums.UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER'
};

exports.RecipeStatus = exports.$Enums.RecipeStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.IngredientCategory = exports.$Enums.IngredientCategory = {
  MALT: 'MALT',
  HOPS: 'HOPS',
  YEAST: 'YEAST',
  ADJUNCT: 'ADJUNCT',
  WATER_CHEMISTRY: 'WATER_CHEMISTRY'
};

exports.InventoryCategory = exports.$Enums.InventoryCategory = {
  RAW_MATERIAL: 'RAW_MATERIAL',
  PACKAGING: 'PACKAGING',
  FINISHED_GOOD: 'FINISHED_GOOD',
  CONSUMABLE: 'CONSUMABLE'
};

exports.LedgerEntryType = exports.$Enums.LedgerEntryType = {
  PURCHASE: 'PURCHASE',
  CONSUMPTION: 'CONSUMPTION',
  PRODUCTION: 'PRODUCTION',
  ADJUSTMENT: 'ADJUSTMENT',
  ADJUSTMENT_ADD: 'ADJUSTMENT_ADD',
  ADJUSTMENT_REMOVE: 'ADJUSTMENT_REMOVE',
  WASTE: 'WASTE',
  SALE: 'SALE',
  RETURN: 'RETURN',
  REVERSAL: 'REVERSAL',
  TRANSFER: 'TRANSFER'
};

exports.BatchStatus = exports.$Enums.BatchStatus = {
  PLANNED: 'PLANNED',
  BREWING: 'BREWING',
  FERMENTING: 'FERMENTING',
  CONDITIONING: 'CONDITIONING',
  READY: 'READY',
  PACKAGING: 'PACKAGING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.TimelineEventType = exports.$Enums.TimelineEventType = {
  CREATED: 'CREATED',
  STARTED: 'STARTED',
  MASH: 'MASH',
  BOIL: 'BOIL',
  TRANSFER: 'TRANSFER',
  GRAVITY_READING: 'GRAVITY_READING',
  DRY_HOP: 'DRY_HOP',
  TEMPERATURE_CHANGE: 'TEMPERATURE_CHANGE',
  NOTE: 'NOTE',
  COMPLETED: 'COMPLETED',
  INGREDIENTS_RESERVED: 'INGREDIENTS_RESERVED',
  BREWING_STARTED: 'BREWING_STARTED',
  MASH_COMPLETE: 'MASH_COMPLETE',
  BOIL_COMPLETE: 'BOIL_COMPLETE',
  TRANSFER_TO_FERMENTER: 'TRANSFER_TO_FERMENTER',
  FERMENTATION_STARTED: 'FERMENTATION_STARTED',
  DRY_HOP_ADDED: 'DRY_HOP_ADDED',
  CONDITIONING_STARTED: 'CONDITIONING_STARTED',
  READY_FOR_PACKAGING: 'READY_FOR_PACKAGING',
  PACKAGING_STARTED: 'PACKAGING_STARTED',
  PACKAGING_COMPLETE: 'PACKAGING_COMPLETE',
  CANCELLED: 'CANCELLED'
};

exports.TankType = exports.$Enums.TankType = {
  FERMENTER: 'FERMENTER',
  BRITE: 'BRITE',
  UNITANK: 'UNITANK',
  KETTLE: 'KETTLE',
  MASH_TUN: 'MASH_TUN',
  HLT: 'HLT'
};

exports.TankStatus = exports.$Enums.TankStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  CLEANING: 'CLEANING',
  MAINTENANCE: 'MAINTENANCE',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE'
};

exports.LotPhase = exports.$Enums.LotPhase = {
  FERMENTATION: 'FERMENTATION',
  CONDITIONING: 'CONDITIONING',
  BRIGHT: 'BRIGHT',
  PACKAGING: 'PACKAGING'
};

exports.TankCapability = exports.$Enums.TankCapability = {
  FERMENTING: 'FERMENTING',
  CONDITIONING: 'CONDITIONING',
  BREWING: 'BREWING',
  BRIGHT: 'BRIGHT',
  STORAGE: 'STORAGE'
};

exports.OccupationPhase = exports.$Enums.OccupationPhase = {
  FERMENTATION: 'FERMENTATION',
  CONDITIONING: 'CONDITIONING',
  STORAGE: 'STORAGE'
};

exports.PackageType = exports.$Enums.PackageType = {
  KEG_50: 'KEG_50',
  KEG_30: 'KEG_30',
  KEG_20: 'KEG_20',
  BOTTLE_750: 'BOTTLE_750',
  BOTTLE_500: 'BOTTLE_500',
  BOTTLE_330: 'BOTTLE_330',
  CAN_500: 'CAN_500',
  CAN_330: 'CAN_330'
};

exports.CustomerType = exports.$Enums.CustomerType = {
  RETAIL: 'RETAIL',
  WHOLESALE: 'WHOLESALE',
  DISTRIBUTOR: 'DISTRIBUTOR',
  RESTAURANT: 'RESTAURANT',
  BAR: 'BAR',
  EXPORT: 'EXPORT'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  REFUNDED: 'REFUNDED'
};

exports.TransactionType = exports.$Enums.TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER'
};

exports.IncomeCategory = exports.$Enums.IncomeCategory = {
  SALE: 'SALE',
  DEPOSIT: 'DEPOSIT',
  REFUND: 'REFUND',
  OTHER: 'OTHER'
};

exports.ExpenseCategory = exports.$Enums.ExpenseCategory = {
  INGREDIENTS: 'INGREDIENTS',
  PACKAGING: 'PACKAGING',
  EQUIPMENT: 'EQUIPMENT',
  UTILITIES: 'UTILITIES',
  SALARY: 'SALARY',
  RENT: 'RENT',
  MARKETING: 'MARKETING',
  MAINTENANCE: 'MAINTENANCE',
  TRANSPORT: 'TRANSPORT',
  OTHER: 'OTHER'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD: 'CARD',
  CHECK: 'CHECK'
};

exports.InvoiceType = exports.$Enums.InvoiceType = {
  OUTGOING: 'OUTGOING',
  INCOMING: 'INCOMING'
};

exports.InvoiceStatus = exports.$Enums.InvoiceStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED'
};

exports.LotStatus = exports.$Enums.LotStatus = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.ReadingType = exports.$Enums.ReadingType = {
  GRAVITY: 'GRAVITY',
  TEMPERATURE: 'TEMPERATURE',
  PH: 'PH',
  PRESSURE: 'PRESSURE',
  DISSOLVED_O2: 'DISSOLVED_O2',
  TURBIDITY: 'TURBIDITY'
};

exports.AssignmentStatus = exports.$Enums.AssignmentStatus = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.TransferType = exports.$Enums.TransferType = {
  FERMENT_TO_CONDITION: 'FERMENT_TO_CONDITION',
  CONDITION_TO_BRIGHT: 'CONDITION_TO_BRIGHT',
  TANK_TO_TANK: 'TANK_TO_TANK',
  BLEND: 'BLEND',
  SPLIT: 'SPLIT'
};

exports.TransferStatus = exports.$Enums.TransferStatus = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.KegStatus = exports.$Enums.KegStatus = {
  AVAILABLE: 'AVAILABLE',
  FILLED: 'FILLED',
  WITH_CUSTOMER: 'WITH_CUSTOMER',
  IN_TRANSIT: 'IN_TRANSIT',
  CLEANING: 'CLEANING',
  DAMAGED: 'DAMAGED',
  LOST: 'LOST'
};

exports.KegCondition = exports.$Enums.KegCondition = {
  GOOD: 'GOOD',
  NEEDS_CLEANING: 'NEEDS_CLEANING',
  DAMAGED: 'DAMAGED'
};

exports.KegAction = exports.$Enums.KegAction = {
  CREATED: 'CREATED',
  FILLED: 'FILLED',
  SHIPPED: 'SHIPPED',
  RETURNED: 'RETURNED',
  CLEANED: 'CLEANED',
  DAMAGED: 'DAMAGED',
  LOST: 'LOST',
  REPAIRED: 'REPAIRED'
};

exports.QCTestType = exports.$Enums.QCTestType = {
  GRAVITY: 'GRAVITY',
  TEMPERATURE: 'TEMPERATURE',
  PH: 'PH',
  DISSOLVED_O2: 'DISSOLVED_O2',
  TURBIDITY: 'TURBIDITY',
  COLOR: 'COLOR',
  BITTERNESS: 'BITTERNESS',
  ALCOHOL: 'ALCOHOL',
  CARBONATION: 'CARBONATION',
  APPEARANCE: 'APPEARANCE',
  AROMA: 'AROMA',
  TASTE: 'TASTE',
  MICROBIOLOGICAL: 'MICROBIOLOGICAL'
};

exports.QCTestStatus = exports.$Enums.QCTestStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  PASSED: 'PASSED',
  WARNING: 'WARNING',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

exports.QCTestPriority = exports.$Enums.QCTestPriority = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  User: 'User',
  Recipe: 'Recipe',
  RecipeIngredient: 'RecipeIngredient',
  InventoryItem: 'InventoryItem',
  InventoryLedger: 'InventoryLedger',
  IngredientCatalog: 'IngredientCatalog',
  Batch: 'Batch',
  BatchIngredient: 'BatchIngredient',
  GravityReading: 'GravityReading',
  BatchTimeline: 'BatchTimeline',
  Tank: 'Tank',
  TankOccupation: 'TankOccupation',
  PackagingRun: 'PackagingRun',
  Customer: 'Customer',
  Supplier: 'Supplier',
  SalesOrder: 'SalesOrder',
  OrderItem: 'OrderItem',
  Transaction: 'Transaction',
  Invoice: 'Invoice',
  InvoiceItem: 'InvoiceItem',
  Payment: 'Payment',
  Expense: 'Expense',
  Budget: 'Budget',
  AuditLog: 'AuditLog',
  BlendingConfig: 'BlendingConfig',
  CIPLog: 'CIPLog',
  Equipment: 'Equipment',
  Lot: 'Lot',
  LotBatch: 'LotBatch',
  LotReading: 'LotReading',
  MaintenanceLog: 'MaintenanceLog',
  ProblemReport: 'ProblemReport',
  TankAssignment: 'TankAssignment',
  Transfer: 'Transfer',
  Keg: 'Keg',
  KegMovement: 'KegMovement',
  QCTest: 'QCTest',
  Configuration: 'Configuration',
  Museum: 'Museum',
  Tour: 'Tour'
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
