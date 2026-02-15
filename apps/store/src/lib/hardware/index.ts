export type { PrinterConnectionType, ScannerMode, FiscalType, FiscalSettings } from "./types";
export {
  printReceipt,
  printViaSerial,
  printViaNetwork,
} from "./printer";
export type { ReceiptData, PrinterSettings } from "./printer";
export { startBarcodeListener, connectWebHIDScanner } from "./scanner";
export { readWeightFromScale } from "./scale";
export type { ScaleReading } from "./scale";
export { sendFiscalReceipt, sendFiscalZReport } from "./fiscal";
export type { FiscalReceiptRequest, FiscalResult } from "./fiscal";
export * from "./escpos";
export { printPosReceipt } from "./pos-print";
export type { PosReceiptInput, PrinterConfig } from "./pos-print";
