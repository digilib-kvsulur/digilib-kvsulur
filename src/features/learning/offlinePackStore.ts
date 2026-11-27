const DB_NAME = "dlms_learning_offline";
const DB_VERSION = 1;
const STORE = "packs";

export type OfflinePackItem = {
  id: string;
  title: string;
  subject: string;
  chapterTitle: string;
  type: string;
  markdown: string | null;
  fileUrl: string | null;
};

export type OfflinePack = {
  id: string;
  classNumber: string;
  subject: string;
  savedAt: number;
  items: OfflinePackItem[];
  bytes: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Offline storage is not available in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Offline storage failed."));
    tx.onabort = () => reject(tx.error || new Error("Offline storage was cancelled."));
  });
}

export function packId(classNumber: string, subject: string) {
  return `${classNumber}::${subject.trim().toLowerCase()}`;
}

export async function saveOfflinePack(pack: OfflinePack): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(pack);
  await transactionDone(tx);
  db.close();
}

export async function listOfflinePacks(): Promise<OfflinePack[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const request = tx.objectStore(STORE).getAll();
  const packs = await new Promise<OfflinePack[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result || []) as OfflinePack[]);
    request.onerror = () => reject(request.error || new Error("Could not read offline packs."));
  });
  await transactionDone(tx);
  db.close();
  return packs.sort((a, b) => b.savedAt - a.savedAt);
}

export async function getOfflinePack(id: string): Promise<OfflinePack | null> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const request = tx.objectStore(STORE).get(id);
  const pack = await new Promise<OfflinePack | null>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as OfflinePack) || null);
    request.onerror = () => reject(request.error || new Error("Could not read the offline pack."));
  });
  await transactionDone(tx);
  db.close();
  return pack;
}

export async function deleteOfflinePack(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await transactionDone(tx);
  db.close();
}

export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage || 0, quota: estimate.quota || 0 };
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
