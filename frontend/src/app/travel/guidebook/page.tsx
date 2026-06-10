import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Q版漫畫圖鑑 | 江南水鄉八日",
  description: "所有已生成的 Q版漫畫景點集合 · 56 個景點 + 26 間美食 = 82 個項目, 按天/類別篩選",
};

export default function Page() {
  return <ClientPage />;
}
