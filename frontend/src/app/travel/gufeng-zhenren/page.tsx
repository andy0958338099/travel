import type { Metadata } from "next";
import { Suspense } from "react";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "古風寫真 | 江南水鄉八日",
  description: "30 種宋代服飾任你選, 把自己的照片變身古裝仕女/書生, 套到江南景點背景, 立即生成可分享可評價的專屬古風寫真",
};

export default function Page() {
  // Suspense 包 useSearchParams (Next.js 14 要求, 不然 build 失敗)
  // https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-amber-700">載入中...</div>}>
      <ClientPage />
    </Suspense>
  );
}
