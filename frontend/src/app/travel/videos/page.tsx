import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "影片分享牆 | 江南水鄉八日",
  description: "12 支江南旅遊影片, 含青花瓷、宮宴、蘇州評彈、西湖民謠等 MV, 食記/景點介紹/行前準備分類",
};

export default function Page() {
  return <ClientPage />;
}
