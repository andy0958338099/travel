// /Volumes/Transcend/manga-studio/frontend/src/app/travel/photo-classifier/page.tsx
// 2026-07-30 聖上拍板: 輕量級照片拖曳分類與引用系統 — Next.js server entry

import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "相片分類器 | 江南水鄉八日",
  description: "3000+ 張無 EXIF 照片拖曳分類 + Album 引用",
};

export default function PhotoClassifierRoute() {
  // server 端只負責 render ClientPage — 資料用 client 自己 seed
  // 真實上線可改為 fetch Supabase, 但本機聖上要求不持久化
  return <ClientPage />;
}
