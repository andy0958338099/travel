import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "換匯/支付攻略 | 江南水鄉八日",
  description:
    "在中國 8 天要用什麼付錢 — 支付寶/微信/銀聯/現金/換匯 完整攻略。手續費試算、實付陷阱、48 格支付場景對照表、緊急狀況應對。",
};

export default function Page() {
  return <ClientPage />;
}
