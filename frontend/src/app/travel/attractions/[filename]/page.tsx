import type { Metadata } from "next";
import { ALL_ATTRACTIONS } from "../../data";
import ClientPage from "./ClientPage";

export function generateMetadata({
  params,
}: {
  params: { filename: string };
}): Metadata {
  const name = decodeURIComponent(params.filename);
  const attraction = ALL_ATTRACTIONS.find((a) => a.name === name);
  if (!attraction) {
    return { title: "景點不存在 | 江南水鄉八日" };
  }
  const enSuffix = attraction.nameEn ? ` · ${attraction.nameEn}` : "";
  return {
    title: `${attraction.name}${enSuffix} | 江南水鄉八日`,
    description: `${attraction.highlight} · 門票 ${attraction.ticket} · 開放時間 ${attraction.hours}`,
    openGraph: {
      title: attraction.name,
      description: attraction.highlight,
      type: "article",
      locale: "zh_TW",
    },
  };
}

export default function Page({
  params,
}: {
  params: { filename: string };
}) {
  const name = decodeURIComponent(params.filename);
  const attraction = ALL_ATTRACTIONS.find((a) => a.name === name);
  return <ClientPage attraction={attraction} requestedName={name} />;
}
