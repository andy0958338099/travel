import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "江南水鄉八日之旅",
  description: "2026 夏季江南水鄉 8 日完整行程規劃, 4 座城市 28 個景點, 含 Q版漫畫、明信片、餐廳評論、預算追蹤、行李清單、地理歷史故事",
  openGraph: {
    title: "江南水鄉八日之旅",
    description: "2026 夏季江南水鄉 8 日完整行程規劃, 4 座城市 28 個景點, 含 Q版漫畫、明信片、餐廳評論、預算追蹤、行李清單、地理歷史故事",
    type: "website",
    locale: "zh_TW",
  },
};

export default function Page() {
  return <ClientPage />;
}
