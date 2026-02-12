
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
  tenantCode: 'tenantCode',
  hotelCode: 'hotelCode',
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
  role: 'role',
  organizationId: 'organizationId',
  emailVerified: 'emailVerified',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  plan: 'plan',
  status: 'status',
  price: 'price',
  currency: 'currency',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  cancelAtPeriodEnd: 'cancelAtPeriodEnd',
  trialStart: 'trialStart',
  trialEnd: 'trialEnd',
  paymentMethod: 'paymentMethod',
  lastPaymentDate: 'lastPaymentDate',
  nextBillingDate: 'nextBillingDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ModuleAccessScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  moduleType: 'moduleType',
  isActive: 'isActive',
  settings: 'settings',
  maxUsers: 'maxUsers',
  maxRecords: 'maxRecords',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ModuleFeatureScalarFieldEnum = {
  id: 'id',
  moduleAccessId: 'moduleAccessId',
  name: 'name',
  isEnabled: 'isEnabled'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  subscriptionId: 'subscriptionId',
  invoiceNumber: 'invoiceNumber',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  dueDate: 'dueDate',
  paidAt: 'paidAt',
  invoiceUrl: 'invoiceUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ModuleConfigScalarFieldEnum = {
  id: 'id',
  moduleType: 'moduleType',
  name: 'name',
  nameEn: 'nameEn',
  nameRu: 'nameRu',
  description: 'description',
  descriptionEn: 'descriptionEn',
  descriptionRu: 'descriptionRu',
  icon: 'icon',
  color: 'color',
  isEnabled: 'isEnabled',
  displayOrder: 'displayOrder',
  starterPrice: 'starterPrice',
  starterDuration: 'starterDuration',
  starterFeatures: 'starterFeatures',
  professionalPrice: 'professionalPrice',
  professionalDuration: 'professionalDuration',
  professionalFeatures: 'professionalFeatures',
  enterprisePrice: 'enterprisePrice',
  enterpriseDuration: 'enterpriseDuration',
  enterpriseFeatures: 'enterpriseFeatures',
  activeOrganizations: 'activeOrganizations',
  totalUsers: 'totalUsers',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LandingPageContentScalarFieldEnum = {
  id: 'id',
  key: 'key',
  heroTitle: 'heroTitle',
  heroSubtitle: 'heroSubtitle',
  heroDescription: 'heroDescription',
  statsBusinesses: 'statsBusinesses',
  statsTransactions: 'statsTransactions',
  statsUsers: 'statsUsers',
  statsUptime: 'statsUptime',
  content: 'content',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupportTicketScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  subject: 'subject',
  description: 'description',
  priority: 'priority',
  status: 'status',
  assignedTo: 'assignedTo',
  resolvedAt: 'resolvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  details: 'details',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.HotelRoomScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  roomNumber: 'roomNumber',
  roomType: 'roomType',
  floor: 'floor',
  status: 'status',
  basePrice: 'basePrice',
  amenities: 'amenities',
  maxOccupancy: 'maxOccupancy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HotelReservationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  roomId: 'roomId',
  guestName: 'guestName',
  guestEmail: 'guestEmail',
  guestPhone: 'guestPhone',
  guestCountry: 'guestCountry',
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  adults: 'adults',
  children: 'children',
  totalAmount: 'totalAmount',
  paidAmount: 'paidAmount',
  status: 'status',
  source: 'source',
  companyName: 'companyName',
  companyTaxId: 'companyTaxId',
  companyAddress: 'companyAddress',
  companyBank: 'companyBank',
  companyBankAccount: 'companyBankAccount',
  notes: 'notes',
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

exports.Prisma.ContactRequestScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  message: 'message',
  module: 'module',
  status: 'status',
  notes: 'notes',
  repliedAt: 'repliedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  nameUk: 'nameUk',
  descriptionUk: 'descriptionUk',
  cityUk: 'cityUk',
  addressUk: 'addressUk',
  slug: 'slug',
  coverImage: 'coverImage',
  introAudioUrl: 'introAudioUrl',
  introAudioUrlEn: 'introAudioUrlEn',
  introAudioUrlRu: 'introAudioUrlRu',
  introAudioUrlDe: 'introAudioUrlDe',
  introAudioUrlFr: 'introAudioUrlFr',
  introAudioUrlUk: 'introAudioUrlUk',
  gallery: 'gallery',
  latitude: 'latitude',
  longitude: 'longitude',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  website: 'website',
  workingHours: 'workingHours',
  showMap: 'showMap',
  showQrScanner: 'showQrScanner',
  isPublished: 'isPublished',
  displayOrder: 'displayOrder',
  category: 'category',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TourScalarFieldEnum = {
  id: 'id',
  museumId: 'museumId',
  name: 'name',
  nameEn: 'nameEn',
  nameRu: 'nameRu',
  nameUk: 'nameUk',
  description: 'description',
  descriptionEn: 'descriptionEn',
  descriptionRu: 'descriptionRu',
  descriptionUk: 'descriptionUk',
  duration: 'duration',
  stopsCount: 'stopsCount',
  isFree: 'isFree',
  price: 'price',
  currency: 'currency',
  isPublished: 'isPublished',
  displayOrder: 'displayOrder',
  allowActivationCodes: 'allowActivationCodes',
  allowBankPayment: 'allowBankPayment',
  coverImage: 'coverImage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HallScalarFieldEnum = {
  id: 'id',
  tourId: 'tourId',
  name: 'name',
  nameEn: 'nameEn',
  nameRu: 'nameRu',
  nameUk: 'nameUk',
  description: 'description',
  descriptionEn: 'descriptionEn',
  descriptionRu: 'descriptionRu',
  descriptionUk: 'descriptionUk',
  floorNumber: 'floorNumber',
  imageUrl: 'imageUrl',
  orderIndex: 'orderIndex',
  isPublished: 'isPublished',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TourStopScalarFieldEnum = {
  id: 'id',
  tourId: 'tourId',
  hallId: 'hallId',
  title: 'title',
  titleEn: 'titleEn',
  titleRu: 'titleRu',
  titleUk: 'titleUk',
  description: 'description',
  descriptionEn: 'descriptionEn',
  descriptionRu: 'descriptionRu',
  descriptionUk: 'descriptionUk',
  transcript: 'transcript',
  transcriptEn: 'transcriptEn',
  transcriptRu: 'transcriptRu',
  transcriptUk: 'transcriptUk',
  audioUrl: 'audioUrl',
  audioUrlEn: 'audioUrlEn',
  audioUrlRu: 'audioUrlRu',
  audioUrlUk: 'audioUrlUk',
  audioDuration: 'audioDuration',
  imageUrl: 'imageUrl',
  images: 'images',
  qrCode: 'qrCode',
  orderIndex: 'orderIndex',
  isPublished: 'isPublished',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TourPackScalarFieldEnum = {
  id: 'id',
  tourId: 'tourId',
  locale: 'locale',
  version: 'version',
  manifestUrl: 'manifestUrl',
  totalSize: 'totalSize',
  status: 'status',
  builtAt: 'builtAt',
  buildLog: 'buildLog',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActivationCodeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  codeHash: 'codeHash',
  durationDays: 'durationDays',
  status: 'status',
  tourIds: 'tourIds',
  museumIds: 'museumIds',
  redeemedAt: 'redeemedAt',
  redeemedBy: 'redeemedBy',
  batchId: 'batchId',
  batchName: 'batchName',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DeviceScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  platform: 'platform',
  deviceName: 'deviceName',
  appVersion: 'appVersion',
  pushToken: 'pushToken',
  lastActiveAt: 'lastActiveAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EntitlementScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  tourId: 'tourId',
  activationCodeId: 'activationCodeId',
  activatedAt: 'activatedAt',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  tbcPaymentId: 'tbcPaymentId',
  tbcStatus: 'tbcStatus',
  tourId: 'tourId',
  museumId: 'museumId',
  deviceId: 'deviceId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  activationCodeId: 'activationCodeId',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GeoGuideEventScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  tourId: 'tourId',
  stopId: 'stopId',
  museumId: 'museumId',
  eventType: 'eventType',
  metadata: 'metadata',
  latitude: 'latitude',
  longitude: 'longitude',
  createdAt: 'createdAt'
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
exports.Role = exports.$Enums.Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORGANIZATION_OWNER: 'ORGANIZATION_OWNER',
  MODULE_ADMIN: 'MODULE_ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER'
};

exports.PlanType = exports.$Enums.PlanType = {
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.ModuleType = exports.$Enums.ModuleType = {
  HOTEL: 'HOTEL',
  RESTAURANT: 'RESTAURANT',
  BEAUTY: 'BEAUTY',
  SHOP: 'SHOP',
  BREWERY: 'BREWERY',
  WINERY: 'WINERY',
  DISTILLERY: 'DISTILLERY'
};

exports.TicketPriority = exports.$Enums.TicketPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.TicketStatus = exports.$Enums.TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

exports.TourPackStatus = exports.$Enums.TourPackStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.ActivationCodeStatus = exports.$Enums.ActivationCodeStatus = {
  AVAILABLE: 'AVAILABLE',
  REDEEMED: 'REDEEMED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED'
};

exports.Prisma.ModelName = {
  Organization: 'Organization',
  User: 'User',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  Subscription: 'Subscription',
  ModuleAccess: 'ModuleAccess',
  ModuleFeature: 'ModuleFeature',
  Invoice: 'Invoice',
  ModuleConfig: 'ModuleConfig',
  LandingPageContent: 'LandingPageContent',
  SupportTicket: 'SupportTicket',
  ActivityLog: 'ActivityLog',
  HotelRoom: 'HotelRoom',
  HotelReservation: 'HotelReservation',
  Configuration: 'Configuration',
  ContactRequest: 'ContactRequest',
  Museum: 'Museum',
  Tour: 'Tour',
  Hall: 'Hall',
  TourStop: 'TourStop',
  TourPack: 'TourPack',
  ActivationCode: 'ActivationCode',
  Device: 'Device',
  Entitlement: 'Entitlement',
  Payment: 'Payment',
  GeoGuideEvent: 'GeoGuideEvent'
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
