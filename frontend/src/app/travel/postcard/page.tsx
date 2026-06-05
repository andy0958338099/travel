import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "卡通旅遊行程圖卡 | 江南水鄉八日",
  description: "8 天行程一鍵生成可分享的卡通圖卡 · 含 AI 圖片生成、合併 PNG、音樂生成",
};

export default function Page() {
  return <ClientPage />;
}
