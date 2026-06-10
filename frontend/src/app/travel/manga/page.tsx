import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Q版漫畫編輯器 | 江南水鄉八日",
  description: "Q版漫畫生成/編輯器 · 選 4 種景點照 + 4 種畫風 + 4 種視角 + 自動 prompt + 漫畫分鏡預覽。生成後到「Q版漫畫圖鑑」收藏。",
};

export default function Page() {
  return <ClientPage />;
}
