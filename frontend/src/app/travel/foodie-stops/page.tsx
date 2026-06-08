import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "網紅名店 | 江南水鄉八日",
  description: "江南 8 日網紅名店指南 — 瑞幸/霸王茶姬/蜜雪冰城/喜茶/龍井茶/都錦生絲綢/嘉興粽子等 12 間網紅店家,含價格、評分、網友評論,標註離景點多近、Day 行程會不會經過。",
};

export default function Page() {
  return <ClientPage />;
}
