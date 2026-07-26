import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "行前須知 | 江南水鄉八日",
  description:
    "出發前必讀 — 通訊/支付/行李/洗手間 4 大行前須知, 全部一次看完。台胞證、支付寶、eSIM、必帶物品、杭州上海公共洗手間評比。",
  openGraph: {
    title: "行前須知 | 江南水鄉八日",
    description:
      "出發前必讀 — 通訊/支付/行李/洗手間 4 大行前須知, 全部一次看完。",
    type: "website",
    locale: "zh_TW",
  },
};

export default function Page() {
  return <ClientPage />;
}