"use client";

export function registerServiceWorker(): void {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {})
      .catch(() => {});
  }
}
