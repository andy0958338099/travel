import type { Metadata } from "next";
import ClientPage from "./ClientPage";
import { SCRIPTS } from "../data";

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
    return { title: "Vlog 劇本 - 江南水鄉八日之旅" };
  }
  return {
    title: `${script.name} - Vlog 劇本`,
    description: script.tagline,
  };
}

export default function Page({ params }: { params: { scriptId: string } }) {
  return <ClientPage scriptId={params.scriptId} />;
}