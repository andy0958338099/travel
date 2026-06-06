import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Q版漫畫圖鑑 | 江南水鄉八日",
  description: "44 個江南景點變 4 格 Q版漫畫, 含導遊風格短中長介紹, 宋代仕女遊江南的時空穿越故事",
};

export default function Page() {
  return <ClientPage />;
}
