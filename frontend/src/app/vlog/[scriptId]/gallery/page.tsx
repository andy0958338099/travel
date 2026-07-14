import type { Metadata } from "next";
import { SCRIPTS } from "../../data";
import ClientPage from "./ClientPage";

export function generateStaticParams() {
  return Object.keys(SCRIPTS).map((scriptId) => ({ scriptId }));
}

export async function generateMetadata({
  params,
}: {
  params: { scriptId: string };
}): Promise<Metadata> {
  const script = SCRIPTS[params.scriptId];
  if (!script) {
    return { title: "找不到劇本 - Vlog 相冊集" };
  }
  return {
    title: `${script.name} · AI 相冊集 - Vlog 劇本`,
    description: `${script.name} 8 天 AI 生圖相冊集 — ${script.tagline}`,
  };
}

export default function Page({
  params,
}: {
  params: { scriptId: string };
}) {
  return <ClientPage scriptId={params.scriptId} />;
}