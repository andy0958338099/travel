import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "美食日誌 | 江南水鄉八日",
  description: "跟著美食博主吃遍江南 8 日：海底撈、小楊生煎、南翔饅頭、游埠豆漿、宮宴等 16 間必吃餐廳",
};

export default function Page() {
  return <ClientPage />;
}
