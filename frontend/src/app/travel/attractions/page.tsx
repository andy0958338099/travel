import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "景點寫真 + 互動地圖 | 江南水鄉八日",
  description: "57 個江南水鄉景點實景寫真 + 互動式地圖，附景點資訊、隱藏管理、行程規劃整合",
  openGraph: {
    title: "景點寫真 + 互動地圖 | 江南水鄉八日",
    description: "57 個江南水鄉景點實景寫真 + 互動式地圖",
    type: "website",
    locale: "zh_TW",
  },
};

export default function Page() {
  return <ClientPage />;
}
