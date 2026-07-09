import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Apple Watch S11 46mm 購買攻略 | 江南水鄉八日",
  description:
    "台灣人在上海/浙江購買 Apple Watch Series 11 46mm 完整攻略 — 真實價格對照、國補申請、線上線下 12 渠道、保固海關注意事項。",
};

export default function Page() {
  return <ClientPage />;
}