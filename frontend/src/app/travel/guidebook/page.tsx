import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Q版漫畫圖鑑 | 江南水鄉八日",
  description: "所有已生成的 Q版漫畫景點集合, 按天/類別篩選",
};

export default function Page() {
  return <ClientPage />;
}
