export const config = {
  app: {
    name: "SaaS Platform",
    description: "Multi-module SaaS platform for business management",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
  database: {
    url: process.env.DATABASE_URL || "",
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET || "",
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  email: {
    from: process.env.EMAIL_FROM || "noreply@platform.ge",
    apiKey: process.env.SENDGRID_API_KEY || "",
  },
  payment: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  storage: {
    s3Bucket: process.env.AWS_S3_BUCKET || "",
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  ports: {
    landing: parseInt(process.env.LANDING_PORT || "3000", 10),
    superAdmin: parseInt(process.env.SUPER_ADMIN_PORT || "3001", 10),
    hotelDashboard: parseInt(process.env.HOTEL_DASHBOARD_PORT || "3010", 10),
    hotelAdmin: parseInt(process.env.HOTEL_ADMIN_PORT || "3110", 10),
    restaurantDashboard: parseInt(process.env.RESTAURANT_DASHBOARD_PORT || "3020", 10),
    restaurantAdmin: parseInt(process.env.RESTAURANT_ADMIN_PORT || "3120", 10),
    beautyDashboard: parseInt(process.env.BEAUTY_DASHBOARD_PORT || "3030", 10),
    beautyAdmin: parseInt(process.env.BEAUTY_ADMIN_PORT || "3130", 10),
    shopDashboard: parseInt(process.env.SHOP_DASHBOARD_PORT || "3040", 10),
    shopAdmin: parseInt(process.env.SHOP_ADMIN_PORT || "3140", 10),
    breweryDashboard: parseInt(process.env.BREWERY_DASHBOARD_PORT || "3050", 10),
    breweryAdmin: parseInt(process.env.BREWERY_ADMIN_PORT || "3150", 10),
    wineryDashboard: parseInt(process.env.WINERY_DASHBOARD_PORT || "3060", 10),
    wineryAdmin: parseInt(process.env.WINERY_ADMIN_PORT || "3160", 10),
    distilleryDashboard: parseInt(process.env.DISTILLERY_DASHBOARD_PORT || "3070", 10),
    distilleryAdmin: parseInt(process.env.DISTILLERY_ADMIN_PORT || "3170", 10),
  },
} as const;

