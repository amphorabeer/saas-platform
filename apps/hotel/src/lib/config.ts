export const APP_CONFIG = {
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  features: {
    nightAudit: true,
    housekeeping: true,
    multiUser: true,
    reports: true,
    invoices: true,
    mobileResponsive: true
  },
  deployment: {
    date: '2024-11-26',
    type: 'MVP'
  },
  app: {
    name: 'Hotel Management System',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
  }
}



