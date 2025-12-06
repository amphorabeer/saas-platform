# 🔍 სალაროს ხელით ტრანზაქციები Night Audit-ში

## ❓ კითხვა: აისახება თუ არა ხელით ტრანზაქციები Night Audit-ში?

---

## ✅ პასუხი: **ნაწილობრივ აისახება**

### 1. **Z-Report-ში ✅ აისახება**

#### კოდი: `NightAuditModule.tsx:2153-2254`

```typescript
const generateZReport = (): any => {
  const businessDate = localStorage.getItem('currentBusinessDate') || selectedDate
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
  const manualTx = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
  
  // Calculate revenues from folios
  let cashPayments = 0
  let cardPayments = 0
  let bankTransfers = 0
  
  // Folio payments
  folios.forEach((folio: any) => {
    folio.transactions?.forEach((t: any) => {
      if (t.date === businessDate && t.credit > 0) {
        const method = t.paymentMethod || 'cash'
        if (method === 'cash') cashPayments += t.credit
        else if (method === 'card') cardPayments += t.credit
        else if (method === 'bank') bankTransfers += t.credit
      }
    })
  })
  
  // ✅ Add manual transactions (INCOME)
  manualTx.forEach((t: any) => {
    if (t.date === businessDate && t.type === 'income') {
      if (t.method === 'cash') cashPayments += t.amount
      else if (t.method === 'card') cardPayments += t.amount
      else if (t.method === 'bank') bankTransfers += t.amount
    }
  })
  
  // ✅ Calculate expenses (MANUAL EXPENSES)
  const expenses = manualTx
    .filter((t: any) => t.date === businessDate && t.type === 'expense')
    .reduce((sum: number, t: any) => sum + t.amount, 0)
  
  return {
    cashPayments,      // ✅ Includes manual income (cash)
    cardPayments,      // ✅ Includes manual income (card)
    bankTransfers,     // ✅ Includes manual income (bank)
    totalPayments: cashPayments + cardPayments + bankTransfers,
    expenses,          // ✅ Includes manual expenses
    netCash: cashPayments - expenses
  }
}
```

**რა აისახება Z-Report-ში:**
- ✅ **ხელით შემოსავლები** → დაემატება `cashPayments`, `cardPayments`, `bankTransfers`-ს
- ✅ **ხელით ხარჯები** → ითვლება `expenses`-ში
- ✅ **წმინდა ნაღდი** → `cashPayments - expenses`

---

### 2. **Revenue გამოთვლაში ❌ არ აისახება**

#### კოდი: `NightAuditModule.tsx:1339`

```typescript
const calculateRealRevenue = async () => {
  // Revenue from Check-outs on this date (completed stays)
  const checkoutRevenue = reservations
    .filter((r: any) => {
      const checkOut = moment(r.checkOut).format('YYYY-MM-DD')
      return checkOut === selectedDate && 
             (r.status === 'CHECKED_OUT' || r.autoCheckOut) &&
             r.status !== 'CANCELLED' && 
             r.status !== 'NO_SHOW'
    })
    .reduce((sum: number, r: any) => sum + (r.totalAmount || 0), 0)
  
  // Also include NO-SHOW charges for this date
  const noShowRevenue = reservations
    .filter((r: any) => {
      const checkIn = moment(r.checkIn).format('YYYY-MM-DD')
      return checkIn === selectedDate && r.status === 'NO_SHOW'
    })
    .reduce((sum: number, r: any) => sum + (r.noShowCharge || 0), 0)
  
  const totalRevenue = checkoutRevenue + noShowRevenue
  
  // ❌ MANUAL TRANSACTIONS NOT INCLUDED!
  return totalRevenue
}
```

**რა არ აისახება:**
- ❌ **ხელით შემოსავლები** → არ ითვლება `totalRevenue`-ში
- ❌ მხოლოდ Check-out-ების და NO-SHOW-ების შემოსავალი

---

### 3. **FinancialReportsService-ში ❌ არ აისახება**

#### კოდი: `FinancialReportsService.ts:6`

```typescript
static async generateDailyRevenueReport(date: string) {
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
  const targetDate = moment(date).format('YYYY-MM-DD')
  
  // Get all CHARGE transactions for the date
  const dayTransactions = folios.flatMap((f: any) => 
    f.transactions
      .filter((t: any) => {
        if (t.type !== 'charge') return false
        const transactionDate = moment(t.date).format('YYYY-MM-DD')
        return transactionDate === targetDate
      })
  )
  
  // ❌ MANUAL TRANSACTIONS NOT INCLUDED!
  // Only folio transactions are used
  
  const totalRevenue = Object.values(revenueByCategory).reduce((sum: number, val: number) => {
    return sum + Number(val) || 0
  }, 0)
  
  return {
    revenue: { total: totalRevenue },  // ❌ No manual transactions
    payments: paymentSummary  // ✅ Payments include folio payments
  }
}
```

**რა არ აისახება:**
- ❌ **ხელით შემოსავლები** → არ ითვლება `revenue.total`-ში
- ✅ **გადახდები** → ითვლება (მაგრამ მხოლოდ Folio-დან)

---

## 📊 შეჯამება

| კომპონენტი | ხელით შემოსავლები | ხელით ხარჯები | სტატუსი |
|------------|------------------|--------------|---------|
| **Z-Report** | ✅ აისახება (payments-ში) | ✅ აისახება (expenses-ში) | ✅ კარგი |
| **Revenue გამოთვლა** | ❌ არ აისახება | ❌ არ აისახება | ⚠️ პრობლემა |
| **FinancialReportsService** | ❌ არ აისახება | ❌ არ აისახება | ⚠️ პრობლემა |

---

## ⚠️ პრობლემა

### რა არ მუშაობს:

1. **Revenue გამოთვლა** (`calculateRealRevenue`) არ ითვლის ხელით შემოსავლებს
   - მხოლოდ Check-out-ების და NO-SHOW-ების შემოსავალი
   - ხელით დეპოზიტები, წინასწარი გადახდები არ ითვლება

2. **FinancialReportsService** არ ითვლის ხელით შემოსავლებს
   - მხოლოდ Folio charge-ები ითვლება
   - ხელით შემოსავლები არ ითვლება revenue-ში

### რა მუშაობს:

1. **Z-Report** სწორად ითვლის:
   - ✅ ხელით შემოსავლები → payments-ში
   - ✅ ხელით ხარჯები → expenses-ში
   - ✅ წმინდა ნაღდი → cashPayments - expenses

---

## 🔧 რეკომენდაცია

### უნდა განახლდეს:

1. **`calculateRealRevenue()`** - დაემატოს ხელით შემოსავლები:
   ```typescript
   const manualIncomes = manualTx
     .filter((t: any) => t.date === selectedDate && t.type === 'income')
     .reduce((sum: number, t: any) => sum + t.amount, 0)
   
   const totalRevenue = checkoutRevenue + noShowRevenue + manualIncomes
   ```

2. **`FinancialReportsService.generateDailyRevenueReport()`** - დაემატოს ხელით შემოსავლები:
   ```typescript
   const manualTx = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
   const manualIncomes = manualTx
     .filter((t: any) => moment(t.date).format('YYYY-MM-DD') === targetDate && t.type === 'income')
   
   // Add to revenue
   manualIncomes.forEach((t: any) => {
     revenueByCategory['misc'] += t.amount
   })
   ```

---

## 📋 დასკვნა

**Z-Report-ში:** ✅ ხელით ტრანზაქციები აისახება (payments და expenses)
**Revenue გამოთვლაში:** ❌ ხელით შემოსავლები არ ითვლება
**FinancialReportsService-ში:** ❌ ხელით შემოსავლები არ ითვლება

**რეკომენდაცია:** განახლდეს `calculateRealRevenue()` და `FinancialReportsService` ხელით შემოსავლების დასამატებლად.

---

**ბოლო განახლება**: 2025-11-28

