// IndexedDB for offline storage
const DB_NAME = "geoguide-offline";
const DB_VERSION = 1;
const AUDIO_STORE = "audio";
const TOURS_STORE = "tours";

interface OfflineTour {
  id: string;
  data: unknown;
  downloadedAt: number;
}

interface OfflineAsset {
  url: string;
  blob: Blob;
  tourId: string;
  downloadedAt: number;
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(TOURS_STORE)) {
        db.createObjectStore(TOURS_STORE, { keyPath: "id" });
      }
    };
  });
}

// Save tour data - with language
export async function saveTourOffline(
  tourId: string,
  tourData: unknown,
  language: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TOURS_STORE, "readwrite");
    const store = transaction.objectStore(TOURS_STORE);

    const data: OfflineTour = {
      id: `${tourId}_${language}`,
      data: tourData,
      downloadedAt: Date.now(),
    };

    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Get tour data for specific language
export async function getTourOffline(tourId: string, language: string): Promise<unknown | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TOURS_STORE, "readonly");
    const store = transaction.objectStore(TOURS_STORE);

    const request = store.get(`${tourId}_${language}`);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as OfflineTour | undefined;
      resolve(result?.data ?? null);
    };
  });
}

// Save asset file (audio or image)
export async function saveAssetOffline(
  url: string,
  tourId: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch asset");

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      received += value.length;

      if (total && onProgress) {
        onProgress(Math.round((received / total) * 100));
      }
    }

    const blob = new Blob(chunks, { type: contentType });

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, "readwrite");
      const store = transaction.objectStore(AUDIO_STORE);

      const data: OfflineAsset = {
        url,
        blob,
        tourId,
        downloadedAt: Date.now(),
      };

      const request = store.put(data);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Error saving asset:", error);
    throw error;
  }
}

// Aliases
export const saveAudioOffline = saveAssetOffline;
export const saveImageOffline = saveAssetOffline;

// Get asset file (audio or image)
export async function getAssetOffline(url: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE, "readonly");
      const store = transaction.objectStore(AUDIO_STORE);

      const request = store.get(url);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as OfflineAsset | undefined;
        if (result?.blob) {
          resolve(URL.createObjectURL(result.blob));
        } else {
          resolve(null);
        }
      };
    });
  } catch {
    return null;
  }
}

// Aliases
export const getAudioOffline = getAssetOffline;
export const getImageOffline = getAssetOffline;

// Check if tour is downloaded for specific language
export async function isTourDownloaded(
  tourId: string,
  language: string
): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(TOURS_STORE, "readonly");
      const store = transaction.objectStore(TOURS_STORE);

      const request = store.get(`${tourId}_${language}`);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };
    });
  } catch {
    return false;
  }
}

// Download entire tour with audio, images, and cover images
export async function downloadTour(
  tour: { 
    id: string;
    coverImage?: string;
    museum?: {
      coverImage?: string;
    };
    stops?: { 
      audioUrl?: string; 
      audioUrlEn?: string; 
      audioUrlRu?: string;
      imageUrl?: string;
    }[] 
  },
  language: string,
  onProgress?: (progress: number, currentFile: string) => void
): Promise<void> {
  const urls: string[] = [];

  // Tour cover image
  if (tour.coverImage) {
    urls.push(tour.coverImage);
  }

  // Museum cover image
  if (tour.museum?.coverImage) {
    urls.push(tour.museum.coverImage);
  }

  // Collect audio and image URLs from stops
  tour.stops?.forEach((stop) => {
    // Audio based on language
    if (language === "ka" && stop.audioUrl) {
      urls.push(stop.audioUrl);
    } else if (language === "en" && stop.audioUrlEn) {
      urls.push(stop.audioUrlEn);
    } else if (language === "ru" && stop.audioUrlRu) {
      urls.push(stop.audioUrlRu);
    } else if (stop.audioUrl) {
      urls.push(stop.audioUrl);
    }

    // Stop images
    if (stop.imageUrl) {
      urls.push(stop.imageUrl);
    }
  });

  const totalFiles = urls.length;

  // Download all files
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalFiles) * 100), `${i + 1}/${totalFiles}`);
    }
    try {
      await saveAssetOffline(url, `${tour.id}_${language}`);
    } catch (e) {
      console.warn("Failed to download:", url);
    }
  }

  // Save tour data with language
  await saveTourOffline(tour.id, tour, language);
}

// Delete tour offline data
export async function deleteTourOffline(
  tourId: string,
  language: string
): Promise<void> {
  const db = await openDB();
  const key = `${tourId}_${language}`;

  // Delete tour
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(TOURS_STORE, "readwrite");
    const store = transaction.objectStore(TOURS_STORE);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

  // Delete associated files
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const asset = cursor.value as OfflineAsset;
        if (asset.tourId === key) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

// Get storage usage
export async function getStorageUsage(): Promise<{
  used: number;
  tours: string[];
}> {
  const db = await openDB();
  let used = 0;
  const tours: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readonly");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const asset = cursor.value as OfflineAsset;
        used += asset.blob.size;
        cursor.continue();
      } else {
        resolve();
      }
    };
  });

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(TOURS_STORE, "readonly");
    const store = transaction.objectStore(TOURS_STORE);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      tours.push(...(request.result as string[]));
      resolve();
    };
  });

  return { used, tours };
}
