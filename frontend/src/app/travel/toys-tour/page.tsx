import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "玩具尋寶導覽 | 江南水鄉八日",
  description: "江南 24 間玩具店, 上海 12 間 + 杭州 12 間, 模型/益智/批發/百貨/卡牌分類, 樂高/萬代/安利美特等店攻略",
};

export default function Page() {
  return <ClientPage />;
}
