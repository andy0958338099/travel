import type { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Vlog 劇本 - 江南水鄉八日之旅",
  description:
    "13 位角色、8 日行程、三種敘事視角的 vlog 劇本比較，選出最對味的江南水鄉八日版本。",
};

export default function Page() {
  return <ClientPage />;
}