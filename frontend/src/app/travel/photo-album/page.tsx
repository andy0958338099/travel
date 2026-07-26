import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "旅程照片集 | 江南水鄉八日",
  description:
    "杭州 / 上海 / 西塘 / 烏鎮 8 日旅程真實照片集, 連結 Google 相簿 — 包含 13 位成員所拍攝的 8 天回憶。",
  openGraph: {
    title: "旅程照片集 | 江南水鄉八日",
    description: "杭州 / 上海 / 西塘 / 烏鎮 8 日旅程真實照片集",
    type: "website",
    locale: "zh_TW",
    // og:image 由 ClientPage 內聯的 og:image 取代 (Google Photos 封面圖)
  },
};

export default function Page() {
  return <ClientPage />;
}