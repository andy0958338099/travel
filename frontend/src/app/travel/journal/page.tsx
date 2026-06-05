import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "旅程日誌 | 江南水鄉八日",
  description: "8 天 4 座城市 · 江南水鄉慢慢走的故事 · 含地圖、景點照片、行程軌跡",
};

export default function Page() {
  return <ClientPage />;
}
