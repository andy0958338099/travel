import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "5 劇本 AI 相冊總覽 - Vlog",
  description:
    "江南水鄉八日之旅 5 種敘事視角的 AI 生圖相冊集總覽 — 224 張圖, 一頁看全貌。",
};

export default function Page() {
  return <ClientPage />;
}