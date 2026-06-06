import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "地理歷史故事 | 江南水鄉八日",
  description: "6 個江南地理歷史故事: 西湖千年詩詞、烏鎮水鄉歷史、西塘煙雨、杭州京杭大運河、龍井茶文化, 含唐宋詩人軼事",
};

export default function Page() {
  return <ClientPage />;
}
