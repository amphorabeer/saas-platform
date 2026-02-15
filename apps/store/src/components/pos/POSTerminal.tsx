"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { ProductGrid } from "./ProductGrid";
import { CartPanel } from "./CartPanel";
import { PinPadModal } from "./PinPadModal";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import { usePosStore } from "@/stores/pos-store";
import { startBarcodeListener } from "@/lib/hardware/scanner";
import { LogOut, UserCircle, FileText, Camera, Keyboard } from "lucide-react";
import { OfflineIndicator } from "./OfflineIndicator";

interface PosPrintConfig {
  store: { name: string; address?: string | null; phone?: string | null; taxId?: string | null } | null;
  receiptConfig: { headerText?: string | null; footerText?: string | null; showTaxId?: boolean; showBarcode?: boolean; paperWidth?: number } | null;
  printerConfig: { connectionType: "USB" | "SERIAL" | "NETWORK"; ip?: string; port?: number } | null;
}

interface POSTerminalProps {
  storeId: string;
  categories: { id: string; name: string; nameKa?: string | null; slug: string }[];
  customers?: { id: string; firstName: string; lastName?: string | null; phone?: string | null; loyaltyPoints?: number }[];
  loyaltyConfig?: { redemptionRate: number; minRedemptionPoints: number } | null;
  products: {
    id: string;
    name: string;
    nameKa?: string | null;
    sku: string;
    barcode?: string | null;
    sellingPrice: number;
    costPrice: number;
    imageUrl?: string | null;
    categoryId?: string | null;
  }[];
  printConfig?: PosPrintConfig;
}

export function POSTerminal({ storeId, categories, products, printConfig, customers = [], loyaltyConfig = null }: POSTerminalProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const addItem = usePosStore((s) => s.addItem);
  const currentEmployee = usePosStore((s) => s.currentEmployee);
  const setCurrentEmployee = usePosStore((s) => s.setCurrentEmployee);

  const handleBarcodeScanned = useCallback((decoded: string) => {
    const match = products.find(
      (p) => p.barcode === decoded || p.sku.toLowerCase() === decoded.toLowerCase()
    );
    if (match) {
      addItem({
        productId: match.id,
        productName: match.name,
        nameKa: match.nameKa,
        unitPrice: match.sellingPrice,
        costPrice: match.costPrice,
        imageUrl: match.imageUrl,
      });
    }
    setShowScanner(false);
  }, [products, addItem]);

  const handleBarcodeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = barcode.trim();
    if (!q) return;
    const match = products.find(
      (p) => p.barcode === q || p.sku.toLowerCase() === q.toLowerCase()
    );
    if (match) {
      addItem({
        productId: match.id,
        productName: match.name,
        nameKa: match.nameKa,
        unitPrice: match.sellingPrice,
        costPrice: match.costPrice,
        imageUrl: match.imageUrl,
      });
    }
    setBarcode("");
  }, [barcode, products, addItem]);

  useEffect(() => {
    const stop = startBarcodeListener({
      onBarcode: (barcode) => {
        const match = products.find(
          (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
        );
        if (match) {
          addItem({
            productId: match.id,
            productName: match.name,
            nameKa: match.nameKa,
            unitPrice: match.sellingPrice,
            costPrice: match.costPrice,
            imageUrl: match.imageUrl,
          });
        }
      },
    });
    return stop;
  }, [products, addItem]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.target.closest("[data-pos-keypad]")) return;
        if (e.key === "F9") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }
      switch (e.key) {
        case "F1":
        case "F2":
        case "F3":
        case "F4":
        case "F5":
        case "F6":
        case "F7":
        case "F8": {
          const idx = parseInt(e.key.replace("F", "")) - 1;
          if (idx >= 0 && idx < categories.length) {
            e.preventDefault();
            document.dispatchEvent(
              new CustomEvent("pos-category", { detail: categories[idx]!.id })
            );
          }
          break;
        }
        case "F9":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case "F10":
          e.preventDefault();
          document.dispatchEvent(new CustomEvent("pos-payment"));
          break;
        case "Escape":
          e.preventDefault();
          document.dispatchEvent(new CustomEvent("pos-cancel"));
          break;
        default:
          break;
      }
    },
    [categories]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary"
      style={{ marginLeft: 0 }}
    >
      {!currentEmployee && <PinPadModal />}

      {/* === TOP HEADER BAR === */}
      <header className="shrink-0 border-b border-border bg-bg-secondary/95 backdrop-blur z-10 px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ძიება (F9)"
            className="w-32 lg:w-48 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
          />

          {/* Barcode input + scan */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1">
            <input
              ref={barcodeInputRef}
              data-pos-barcode-input="true"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="ბარკოდი"
              className="w-28 lg:w-36 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-copper/20 text-copper-light border border-copper/30 hover:bg-copper/30 transition-colors"
              title="კამერით სკანირება"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="submit"
              className="h-8 flex items-center rounded-lg bg-copper text-white px-3 text-xs font-medium hover:bg-copper-dark transition-colors"
            >
              <Keyboard className="h-3.5 w-3.5 mr-1" />
              OK
            </button>
          </form>

          {/* Separator */}
          <div className="h-6 w-px bg-border mx-1" aria-hidden />

          {/* Action buttons */}
          <Link
            href="/reports/z-report"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/80 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="ცვლის დახურვა / Z რეპორტი"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ცვლის დახურვა</span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/80 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">გასვლა</span>
          </Link>

          {currentEmployee && (
            <button
              type="button"
              onClick={() => setCurrentEmployee(null)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/80 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors max-w-[140px]"
              title="ცვლის მომხმარებელი"
            >
              <UserCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{currentEmployee.firstName} {currentEmployee.lastName}</span>
            </button>
          )}

          {/* Online indicator — pushed to right */}
          <div className="ml-auto">
            <OfflineIndicator />
          </div>
        </div>
      </header>

      {/* === BARCODE SCANNER MODAL === */}
      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />

      {/* === MAIN CONTENT: Products (left) + Cart (right) === */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left: Product grid with category tabs */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ProductGrid
            categories={categories}
            products={products}
            search={search}
            setSearch={setSearch}
          />
        </div>

        {/* Right: Cart panel */}
        <div className="w-full md:w-[340px] lg:w-[380px] border-t md:border-t-0 md:border-l border-border flex flex-col shrink-0">
          <CartPanel
            storeId={storeId}
            customers={customers}
            loyaltyConfig={loyaltyConfig}
            searchInputRef={searchInputRef}
            barcodeInputRef={barcodeInputRef}
            printConfig={printConfig}
          />
        </div>
      </div>
    </div>
  );
}