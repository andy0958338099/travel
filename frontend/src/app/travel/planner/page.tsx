import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "行程價格規劃器 | 江南水鄉八日",
  description: "29 個景點自由排成 8 天行程 · 一鍵計算每人費用、PDF 匯出、雲端同步",
};

export default function Page() {
  return <ClientPage />;
}
