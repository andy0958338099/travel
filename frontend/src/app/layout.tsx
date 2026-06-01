import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalToastHost } from "@/components/GlobalToastHost";

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

export const metadata: Metadata = {
  title: "Manga Studio — 漫劇生成系統",
  description: "角色與場景一致性的 AI 漫劇生成系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <GlobalToastHost />
      </body>
    </html>
  );
}
