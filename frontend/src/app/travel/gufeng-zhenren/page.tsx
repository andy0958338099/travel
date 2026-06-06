import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "古風寫真 | 江南水鄉八日",
  description: "30 種宋代服飾任你選, 把自己的照片變身古裝仕女/書生, 套到江南景點背景, 立即生成可分享可評價的專屬古風寫真",
};

export default function Page() {
  return <ClientPage />;
}
