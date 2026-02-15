"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScannerModal({ open, onClose, onScan }: BarcodeScannerModalProps) {
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    const start = async () => {
      try {
        const scanner = new Html5Qrcode("barcode-scanner-container");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
            onClose();
          },
          () => {}
        );
        scannerRef.current = scanner;
      } catch (e) {
        setError(e instanceof Error ? e.message : "კამერა ვერ ჩაირთვა");
      }
    };
    start();
    return () => {
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [open, onScan, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex justify-between items-center p-4 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold">ბარკოდის სკანირება</h2>
        <button
          onClick={onClose}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg hover:bg-bg-tertiary"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <div ref={containerRef} id="barcode-scanner-container" className="flex-1 min-h-0" />
      {error && (
        <div className="p-4 text-red-400 text-sm text-center">{error}</div>
      )}
    </div>
  );
}
