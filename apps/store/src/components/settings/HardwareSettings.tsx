"use client";

import { useState } from "react";
import {
  printReceipt,
  printViaSerial,
  readWeightFromScale,
  sendFiscalReceipt,
  startBarcodeListener,
  type ReceiptData,
  type PrinterSettings,
} from "@/lib/hardware";
import { getDeviceConfigs, upsertDeviceConfig } from "@/lib/store-actions";
import { Button } from "@saas-platform/ui";
import { Printer, ScanLine, Scale, Receipt } from "lucide-react";

const DEVICE_LABELS: Record<string, string> = {
  RECEIPT_PRINTER: "ჩეკის პრინტერი",
  FISCAL_PRINTER: "ფისკალური პრინტერი",
  BARCODE_SCANNER: "ბარკოდ სკანერი",
  WEIGHT_SCALE: "სასწორი",
};

interface HardwareSettingsProps {
  initialDevices: Awaited<ReturnType<typeof getDeviceConfigs>>;
  store: Awaited<ReturnType<typeof import("@/lib/store-actions").getStoreSettings>> | null;
  receiptConfig: Awaited<ReturnType<typeof import("@/lib/store-actions").getReceiptConfig>> | null;
}

export function HardwareSettings({
  initialDevices,
  store,
  receiptConfig,
}: HardwareSettingsProps) {
  const [devices, setDevices] = useState(initialDevices);
  const [printerIp, setPrinterIp] = useState("");
  const [printerPort, setPrinterPort] = useState(9100);
  const [printerConnType, setPrinterConnType] = useState<"USB" | "NETWORK">("NETWORK");
  const [testResult, setTestResult] = useState<string | null>(null);

  const receiptPrinter = devices.find((d) => d.deviceType === "RECEIPT_PRINTER");
  const printerSettings = (receiptPrinter?.settings as { ip?: string; port?: number; connectionType?: string }) ?? {};

  const handleTestPrinter = async () => {
    setTestResult(null);
    const data: ReceiptData = {
      storeName: store?.name ?? "ტესტი",
      address: store?.address ?? undefined,
      phone: store?.phone ?? undefined,
      headerText: receiptConfig?.headerText ?? undefined,
      footerText: receiptConfig?.footerText ?? "მადლობა შესაძენად!",
      items: [
        { name: "ტესტური პროდუქტი", quantity: 1, unitPrice: 1.5, total: 1.5 },
      ],
      subtotal: 1.5,
      total: 1.5,
      showTaxId: receiptConfig?.showTaxId ?? false,
      taxId: store?.taxId ?? undefined,
      showBarcode: receiptConfig?.showBarcode ?? false,
      paperWidth: receiptConfig?.paperWidth ?? 80,
    };
    const settings: PrinterSettings = {
      connectionType: printerConnType,
      ip: printerConnType === "NETWORK" ? printerIp || printerSettings.ip : undefined,
      port: printerConnType === "NETWORK" ? printerPort || printerSettings.port : undefined,
    };
    const result =
      printerConnType === "USB"
        ? await printViaSerial(data)
        : await printReceipt(data, settings);
    setTestResult(result.success ? "წარმატებული!" : result.error ?? "შეცდომა");
  };

  const handleTestScale = async () => {
    setTestResult(null);
    const result = await readWeightFromScale({});
    setTestResult(
      result.success
        ? `წონა: ${result.weight} ${result.unit}`
        : result.error ?? "შეცდომა"
    );
  };

  const handleTestBarcode = () => {
    setTestResult("სკანირებას ელოდეთ... (5 წამში გაუქმდება)");
    const stop = startBarcodeListener({
      onBarcode: (barcode) => {
        setTestResult(`სკანირებული: ${barcode}`);
        stop();
      },
    });
    setTimeout(() => {
      stop();
      setTestResult((prev) => (prev === "სკანირებას ელოდეთ... (5 წამში გაუქმდება)" ? "დრო ამოიწურა" : prev));
    }, 5000);
  };

  const handleSavePrinter = async () => {
    const result = await upsertDeviceConfig({
      deviceType: "RECEIPT_PRINTER",
      name: "ჩეკის პრინტერი",
      connectionType: printerConnType,
      settings:
        printerConnType === "NETWORK"
          ? { ip: printerIp, port: printerPort }
          : { connectionType: "USB" },
      isActive: true,
    });
    if (result.success) {
      const updated = await getDeviceConfigs();
      setDevices(updated);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* პრინტერი */}
      <section className="rounded-xl border border-border bg-bg-tertiary p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Printer className="w-5 h-5" />
          ჩეკის პრინტერი
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">კავშირის ტიპი</label>
            <select
              value={printerConnType}
              onChange={(e) => setPrinterConnType(e.target.value as "USB" | "NETWORK")}
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
            >
              <option value="USB">USB / Serial</option>
              <option value="NETWORK">ქსელი (IP)</option>
            </select>
          </div>
          {printerConnType === "NETWORK" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">IP მისამართი</label>
                <input
                  type="text"
                  value={printerIp || printerSettings.ip || ""}
                  onChange={(e) => setPrinterIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">პორტი</label>
                <input
                  type="number"
                  value={printerPort || printerSettings.port || 9100}
                  onChange={(e) => setPrinterPort(parseInt(e.target.value, 10) || 9100)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary"
                />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSavePrinter}>
              შენახვა
            </Button>
            <Button size="sm" variant="outline" onClick={handleTestPrinter}>
              ტესტის ბეჭდვა
            </Button>
          </div>
        </div>
      </section>

      {/* სკანერი */}
      <section className="rounded-xl border border-border bg-bg-tertiary p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ScanLine className="w-5 h-5" />
          ბარკოდ სკანერი
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Keyboard Emulation რეჟიმი — სკანერი მუშაობს როგორც კლავიატურა. POS-ში ბარკოდის ველზე ფოკუსით
          სკანირება ავტომატურად დაამატებს პროდუქტს.
        </p>
        <Button size="sm" variant="outline" onClick={handleTestBarcode}>
          ტესტის სკანირება
        </Button>
      </section>

      {/* სასწორი */}
      <section className="rounded-xl border border-border bg-bg-tertiary p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5" />
          სასწორი
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Web Serial API — დააჭირეთ ტესტს და აირჩიეთ სასწორის COM პორტი.
        </p>
        <Button size="sm" variant="outline" onClick={handleTestScale}>
          წონის წაკითხვა
        </Button>
      </section>

      {/* ფისკალური */}
      <section className="rounded-xl border border-border bg-bg-tertiary p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          ფისკალური აპარატი
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Kasa.ge / Daisy Expert — კონფიგურაცია პარამეტრების ინტეგრაციების სექციაში.
        </p>
      </section>

      {testResult && (
        <div className="p-4 rounded-lg bg-bg-tertiary border border-border text-sm">
          {testResult}
        </div>
      )}
    </div>
  );
}
