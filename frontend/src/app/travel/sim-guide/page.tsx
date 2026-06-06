import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "陸旅通訊攻略 | 江南水鄉八日",
  description: "台灣港澳遊客來大陸旅遊必讀: 中國門號 vs eSIM 完整對比, 6 個常用 APP (微信/支付寶/美團/高德/滴滴/12306) 差異, 3 大電信 5 個 eSIM 平台評比, 3 個真實情境案例",
  openGraph: {
    title: "陸旅通訊攻略 | 江南水鄉八日",
    description: "台灣港澳遊客來大陸旅遊必讀: 中國門號 vs eSIM 完整對比, 6 個常用 APP 差異, 3 大電信 5 個 eSIM 平台評比",
    type: "website",
    locale: "zh_TW",
  },
};

export default function Page() {
  return <ClientPage />;
}
