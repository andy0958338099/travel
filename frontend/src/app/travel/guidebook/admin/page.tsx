import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "漫畫圖鑑管理 | 江南水鄉八日",
  description: "批次生成/重新生成 Q版漫畫的管理介面",
};

export default function Page() {
  return <ClientPage />;
}
