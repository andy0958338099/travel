/**
 * IndexedDB 持久化圖片模組 (2026-06-12 聖上拍板)
 *
 * 原因: localStorage 5MB limit, 8 個 1.7MB base64 圖 = 14MB 撐爆.
 * IndexedDB 50MB+ 限制, 且非同步不會 block UI.
 *
 * 用法:
 *   import { saveImage, loadImage, loadAllImages, deleteImage } from "@/lib/postcard-storage";
 *   await saveImage(1, { url, prompt, provider });
 *   const img = await loadImage(1);
 */

const DB_NAME = "postcard-images";
const STORE = "images";
const DB_VERSION = 1;
const KEY_PREFIX = "day-";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available (SSR or unsupported browser)"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export interface StoredImage {
  url: string;       // base64
  prompt: string;
  provider: string;
  savedAt: number;   // Date.now()
}

function key(day: number): string {
  return `${KEY_PREFIX}${day}`;
}

/** 存單天的圖 + metadata */
export async function saveImage(day: number, data: Omit<StoredImage, "savedAt">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.put({ ...data, savedAt: Date.now() }, key(day));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** 載單天的圖 + metadata */
export async function loadImage(day: number): Promise<StoredImage | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(key(day));
    req.onsuccess = () => resolve((req.result as StoredImage) || null);
    req.onerror = () => reject(req.error);
  });
}

/** 載所有 8 天的圖, 回傳 { 1: img1, 2: img2, ... } 格式 */
export async function loadAllImages(): Promise<Record<number, StoredImage>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    keysReq.onsuccess = () => {
      valsReq.onsuccess = () => {
        const result: Record<number, StoredImage> = {};
        keysReq.result.forEach((k, i) => {
          const keyStr = String(k);
          const m = keyStr.match(/^day-(\d+)$/);
          if (m) {
            const day = parseInt(m[1], 10);
            result[day] = valsReq.result[i] as StoredImage;
          }
        });
        resolve(result);
      };
      valsReq.onerror = () => reject(valsReq.error);
    };
    keysReq.onerror = () => reject(keysReq.error);
  });
}

/** 刪單天的圖 */
export async function deleteImage(day: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.delete(key(day));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** 刪所有圖 (debug / 聖上一鍵清空用) */
export async function clearAllImages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
