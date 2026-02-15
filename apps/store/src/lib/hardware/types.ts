/** Hardware device settings and connection types */

export type PrinterConnectionType = "USB" | "SERIAL" | "NETWORK";

export interface PrinterSettings {
  connectionType: PrinterConnectionType;
  /** Network: IP address */
  ip?: string;
  /** Network: port (default 9100) */
  port?: number;
  /** Serial: port name / path */
  serialPort?: string;
  /** Serial: baud rate */
  baudRate?: number;
}

export type ScannerMode = "KEYBOARD" | "WEBHID";

export interface ScannerSettings {
  mode: ScannerMode;
}

export interface ScaleSettings {
  port?: string;
  baudRate?: number;
  /** ACLAS/CAS protocol variant */
  protocol?: "ACLAS" | "CAS";
}

export type FiscalType = "KASA_GE" | "DAISY";

export interface FiscalSettings {
  type: FiscalType;
  apiUrl?: string;
  /** Encoded credentials */
  credentials?: Record<string, string>;
}
