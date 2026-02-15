"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePosStore } from "@/stores/pos-store";

const PAD_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "", "0", "⌫"];

export function PinPadModal() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setCurrentEmployee } = usePosStore();

  const handleCancel = () => {
    router.push("/dashboard");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const handleKey = (key: string) => {
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError("");
    } else if (key && pin.length < 6) {
      setPin((p) => p + key);
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (!pin || pin.length < 4) {
      setError("PIN უნდა იყოს მინიმუმ 4 ციფრი");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pos/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok && data.employee) {
        setCurrentEmployee({
          id: data.employee.id,
          firstName: data.employee.firstName,
          lastName: data.employee.lastName,
          role: data.employee.role,
        });
        setPin("");
      } else {
        setError(data.error ?? "არასწორი PIN");
        setPin("");
      }
    } catch {
      setError("შეცდომა. სცადეთ თავიდან.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-secondary p-6 shadow-xl">
        <h3 className="text-center text-lg font-medium text-text">POS შესვლა</h3>
        <p className="mt-1 text-center text-sm text-text-muted">
          შეიყვანეთ თქვენი PIN კოდი
        </p>
        <div className="mt-4 flex justify-center">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-full ${
                  i < pin.length ? "bg-copper" : "bg-bg-tertiary"
                }`}
              />
            ))}
          </div>
        </div>
        {error && (
          <p className="mt-2 text-center text-sm text-red-400">{error}</p>
        )}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {PAD_KEYS.map((key) => (
            <button
              key={key || `empty-${PAD_KEYS.indexOf(key)}`}
              type="button"
              onClick={() => (key ? handleKey(key) : null)}
              disabled={!key || loading}
              className={`flex h-14 items-center justify-center rounded-xl text-xl font-medium transition ${
                key
                  ? "bg-bg-tertiary text-text hover:bg-bg-tertiary/80 active:scale-95 disabled:opacity-50"
                  : "cursor-default"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pin.length < 4 || loading}
            className="flex-1 rounded-lg bg-copper py-3 font-medium text-white transition hover:bg-copper/90 disabled:opacity-50"
          >
            {loading ? "შემოწმება..." : "შესვლა"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-border bg-bg-tertiary py-3 font-medium text-text-secondary transition hover:bg-bg-tertiary/80 disabled:opacity-50"
          >
            გაუქმება
          </button>
        </div>
      </div>
    </div>
  );
}
