import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "上傳照片生漫畫 | 江南水鄉八日",
  description: "上傳自己的照片, 自動生成 Q版風格漫畫",
};

export default function Page() {
  return <ClientPage />;
}
