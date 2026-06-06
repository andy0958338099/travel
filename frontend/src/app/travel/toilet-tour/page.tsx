import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "洗手間導覽 | 江南水鄉八日",
  description: "江南 17 處洗手間評比, 上海 10 處 + 杭州 7 處, 公共/商場/飯店分類, 清潔度參考",
};

export default function Page() {
  return <ClientPage />;
}
