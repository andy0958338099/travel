import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "飯店 Room Tour | 江南水鄉八日",
  description: "5 間江南飯店 (上海嘉廷/杭州大酒店/烏鎮悠舍/西塘古韻/烏鎮西柵民宿) 64 張照片, 客房/套房/公共區域/餐飲/設施分類",
};

export default function Page() {
  return <ClientPage />;
}
