"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { XMarkIcon, QrCodeIcon } from "@heroicons/react/24/outline";

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Search for stop by QR code
      const res = await fetch(`/api/stops/${code.trim().toUpperCase()}`);

      if (res.ok) {
        const data = await res.json();
        // Navigate back to tour page with stop selected
        router.push(
          `/museum/${params.slug}/tour/${params.tourId}?stop=${data.stop.id}`
        );
      } else {
        setError(
          "კოდი ვერ მოიძებნა. შეამოწმეთ და სცადეთ ხელახლა."
        );
      }
    } catch (err) {
      setError("შეცდომა მოხდა. სცადეთ ხელახლა.");
    } finally {
      setLoading(false);
    }
  };

  const handleNumberClick = (num: string) => {
    if (code.length < 12) {
      setCode(code + num);
    }
  };

  const handleBackspace = () => {
    setCode(code.slice(0, -1));
  };

  const handleClear = () => {
    setCode("");
    setError("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">კოდის შეყვანა</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Icon */}
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <QrCodeIcon className="w-10 h-10 text-amber-600" />
        </div>

        {/* Instructions */}
        <p className="text-gray-600 text-center mb-6">
          შეიყვანეთ გაჩერების კოდი
          <br />
          <span className="text-sm text-gray-400">
            მაგ: STOP-A1B2C3D4
          </span>
        </p>

        {/* Code Input Display */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-4 focus-within:border-amber-500 transition-colors">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="STOP-XXXXXXXX"
              className="w-full text-center text-2xl font-mono tracking-wider outline-none"
              autoFocus
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!code.trim() || loading}
            className="w-full py-4 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                იძებნება...
              </span>
            ) : (
              "მოძებნა"
            )}
          </button>
        </form>

        {/* Quick number pad for common codes */}
        <div className="mt-8 w-full max-w-sm">
          <p className="text-sm text-gray-400 text-center mb-3">
            ან აირჩიეთ ნომერი:
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => (
              <button
                key={num}
                onClick={() =>
                  router.push(
                    `/museum/${params.slug}/tour/${params.tourId}?stopIndex=${
                      num - 1
                    }`
                  )
                }
                className="aspect-square bg-white border rounded-lg font-medium hover:bg-amber-50 hover:border-amber-500 transition-colors"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
