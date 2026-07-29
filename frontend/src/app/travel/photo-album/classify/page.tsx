import type { Metadata } from "next";
import ClassifyClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "手動相簿分類 | 旅程照片集",
  description: "手動拖曳分類 8 天 7 夜江南旅程照片",
};

export default function ClassifyPageRoute() {
  return <ClassifyClientPage />;
}
