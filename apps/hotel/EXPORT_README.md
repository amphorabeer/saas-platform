# Hotel PMS - Project Export

## 📦 Export Information

This ZIP archive contains the complete Hotel PMS project ready for testing and deployment.

## 📁 Included Files and Folders

### Root Configuration Files:
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `pnpm-lock.yaml` or `package-lock.json` - Dependency lock file

### Source Code:
- `/src/app/` - Next.js application pages and API routes
  - `page.tsx` - Main dashboard
  - `layout.tsx` - Root layout
  - `globals.css` - Global styles
  - `/api/` - API routes (email, hotel endpoints)
  - `/login/` - Login page

- `/src/components/` - React components
  - All UI components (Calendar, Reservations, Financial, Settings, Operations)
  - `/settings/` - Settings sub-components

- `/src/services/` - Business logic services
  - `PostingService.ts` - Room charge posting
  - `PaymentService.ts` - Payment processing
  - `ExtraChargesService.ts` - Extra charges management
  - `PackagePostingService.ts` - Package management
  - `FolioRoutingService.ts` - Folio routing
  - `FolioAutoCloseService.ts` - Folio auto-close
  - `FinancialReportsService.ts` - Financial reports

- `/src/types/` - TypeScript type definitions
  - `folio.types.ts` - Folio types
  - `package.types.ts` - Package types
  - `extraCharges.types.ts` - Extra charges types
  - `folioRouting.types.ts` - Routing types

- `/src/lib/` - Utility libraries
  - `activityLogger.ts` - Activity logging
  - `dataStore.ts` - Data persistence
  - `systemLockService.ts` - System locking
  - `reportService.ts` - Report generation

### Data Files:
- `/data/` - JSON data files (reservations, rooms)

### Static Assets:
- `/public/` - Public static files (if exists)

## 🚀 Installation & Setup

1. **Extract the ZIP file**
   ```bash
   unzip hotel-pms-project.zip
   cd hotel-pms-export
   ```

2. **Install dependencies**
   ```bash
   # If using pnpm (recommended)
   pnpm install
   
   # Or if using npm
   npm install
   ```

3. **Set up environment variables**
   - Create `.env.local` file
   - Add required environment variables (database URL, email config, etc.)

4. **Run development server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3010 in your browser

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- PostgreSQL (if using database)
- Email service configuration (for email features)

## 🔧 Configuration

### Database:
- Configure `DATABASE_URL` in `.env.local`
- Or use localStorage (default, no database required)

### Email:
- Configure email settings in `.env.local`:
  ```
  EMAIL_HOST=smtp.example.com
  EMAIL_PORT=587
  EMAIL_USER=your-email@example.com
  EMAIL_PASS=your-password
  EMAIL_FROM=noreply@hotel.com
  ```

## 📝 Features Included

✅ Reservation Management
✅ Calendar System (Room Calendar)
✅ Check-in/Check-out Process
✅ Folio Management
✅ Payment Processing (8 methods)
✅ Extra Charges (14 categories, 32+ items)
✅ Package Management (BB, HB, FB, AI)
✅ Night Audit System v2
✅ Financial Dashboard
✅ Settings Hub
✅ Cashier Module
✅ Activity Logging
✅ System Locking

## 🐛 Recent Bug Fixes

All critical bugs have been fixed:
- ✅ Balance calculation (recalculates from transactions)
- ✅ Payment processing (proper balance updates)
- ✅ Check-in folio creation (automatic)
- ✅ Tax calculation (loads from settings)
- ✅ Check-out validation (allows rounding errors)
- ✅ Duplicate charge prevention

## 📚 Documentation

See included markdown files:
- `BUG_REPORT.md` - Bug report and fixes
- `BUG_FIXES_SUMMARY.md` - Summary of all fixes
- `SETTINGS_HUB_STRUCTURE.md` - Settings Hub documentation
- `NIGHT_AUDIT_RULES.md` - Night Audit rules
- `CALENDAR_RULES.md` - Calendar rules

## ⚠️ Notes

- This export does NOT include:
  - `node_modules/` (install with `pnpm install`)
  - `.next/` build folder (generated on build)
  - `.git/` version control
  - `.env` files (create your own)

- All data is stored in `localStorage` by default
- For production, configure database connection

## 🆘 Support

For issues or questions:
1. Check `BUG_REPORT.md` for known issues
2. Review component documentation
3. Check browser console for errors

## 📄 License

This is a private project export for testing purposes.



