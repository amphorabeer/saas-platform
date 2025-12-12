# BrewMaster PRO - Data Integration Plan

## ✅ ფაზა 1: გვერდების განახლება (COMPLETED)

| გვერდი | ფაილი | სტატუსი |
|--------|-------|---------|
| Dashboard | /app/page.tsx | ✅ Done |
| Production | /app/production/page.tsx | ✅ Done |
| Fermentation | /app/fermentation/page.tsx | ✅ Done |
| Recipes | /app/recipes/page.tsx | ✅ Done |
| Calendar | /app/calendar/page.tsx | ✅ Done |
| Inventory | /app/inventory/page.tsx | ✅ Done |
| Sales | /app/sales/page.tsx | ✅ Done |
| Sales/Customers | /app/sales/customers/page.tsx | ✅ Done |
| Sales/Orders | /app/sales/orders/page.tsx | ✅ Done |
| Quality | /app/quality/page.tsx | ✅ Done |
| Reports | /app/reports/page.tsx | ✅ Done |

## 📁 ცენტრალიზებული Data ფაილი

**მდებარეობა:** `/src/data/centralData.ts`

### მონაცემები:
- `staff[]` - 5 თანამშრომელი
- `recipes[]` - 5 რეცეპტი
- `tanks[]` - 8 ტანკი
- `batches[]` - 6 პარტია
- `ingredients[]` - 15 ინგრედიენტი
- `customers[]` - 8 კლიენტი
- `products[]` - 13 პროდუქტი
- `orders[]` - 6 შეკვეთა
- `kegs[]` - 10 კეგი
- `calendarEvents[]` - 8 ივენთი

### Helper Functions:
- `getBatchById()`, `getTankById()`, `getRecipeById()`
- `getActiveBatches()`, `getAvailableTanks()`, `getPendingOrders()`
- `getLowStockIngredients()`
- `getStats()` - სტატისტიკა dashboard-ისთვის

## ⏳ ფაზა 2: მოდულებს შორის კავშირები (TODO)

1. Production → Fermentation (პარტია → ტანკი)
2. Production → Quality (პარტია → QC ტესტები)
3. Sales → Inventory (შეკვეთა → მარაგის შემცირება)
4. Sales → Finances (შეკვეთა → ინვოისი)
5. Calendar ↔ ყველა (events from batches, orders, equipment)

## ⏳ ფაზა 3: მომავალი გაუმჯობესებები (TODO)

- [ ] State Management (Zustand/Context)
- [ ] API Routes (/api/batches, /api/orders)
- [ ] Database Integration (Prisma + PostgreSQL/SQLite)
- [ ] Real-time updates
