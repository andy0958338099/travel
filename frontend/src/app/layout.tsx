import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import { GlobalToastHost } from "@/components/GlobalToastHost";
import { SyncStatusProvider } from "@/components/SyncStatusProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const notoSerifTC = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-serif-tc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "江南水鄉八日之旅",
  description: "2026 夏季杭州水鄉深度旅遊網站，含 Q版 4 格漫畫、行程規劃、明信片圖卡、AI 影音日記",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifTC.variable} antialiased`}
      >
        <SyncStatusProvider>
          {children}
          <GlobalToastHost />
        </SyncStatusProvider>
      </body>
    </html>
  );
}
