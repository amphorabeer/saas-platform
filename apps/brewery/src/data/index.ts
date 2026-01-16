// =====================================================
// Data Exports - Central Hub
// =====================================================

// Central Data (ახალი ცენტრალიზებული წყარო)
export * from './centralData'

// Legacy Data Files (თავსებადობისთვის)
export { mockEquipment, mockMaintenanceRecords, mockSpareParts, mockCIPLogs, mockProblemReports } from './equipmentData'
export type { Equipment, MaintenanceRecord, CIPLog, ProblemReport, SparePart, MaintenanceType, Priority, Severity } from './equipmentData'
export { mockTransactions, mockInvoicesOutgoing, mockInvoicesIncoming, mockMonthlyFinancials, mockBudgets } from './financeData'
export type { Transaction, Invoice, InvoiceItem, Payment, TransactionType, IncomeCategory, ExpenseCategory, PaymentMethod, InvoiceType } from './financeData'
// export from qualityData - conflicts with centralData
// export from settingsData - conflicts with centralData
