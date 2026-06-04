"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { getCharacters, getScenes, getEpisodes } from "@/lib/api";

export default function Dashboard() {
  const [counts, setCounts] = useState({ characters: 0, scenes: 0, episodes: 0, jobs: 0 });

  useEffect(() => {
    Promise.all([getCharacters(), getScenes(), getEpisodes()]).then(
      ([chars, scenes, eps]) => {
        setCounts({
          characters: Array.isArray(chars) ? chars.length : 0,
          scenes: Array.isArray(scenes) ? scenes.length : 0,
          episodes: Array.isArray(eps) ? eps.length : 0,
          jobs: 0,
        });
      }
    );
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">江南水鄉八日之旅</h1>
      <p className="text-gray-600 mb-6">
        Brian & Mana 2026 夏季旅遊網站 · 含 Q版 4 格漫畫、行程規劃、明信片圖卡、AI 影音日記
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card title="角色" href="/characters" count={counts.characters} description="管理角色資產、Lora、Seed" />
        <Card title="場景" href="/scenes" count={counts.scenes} description="管理場景背景與風格" />
        <Card title="集數" href="/episodes" count={counts.episodes} description="劇本與集數管理" />
        <Card title="生成" href="/generate" count={counts.jobs} description="AI 圖片與影片生成" />
        <Card title="旅遊" href="/travel" count={8} description="杭港澳深度之旅行程" />
      </div>
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-bold mb-2">工作流程</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>建立角色 → 上傳參考圖 → 設定 Lora / Seed</li>
          <li>建立場景 → 上傳背景圖 → 設定風格</li>
          <li>新增集數 → 撰寫腳本</li>
          <li>選擇角色 + 場景 → 輸入提示詞 → 生成基底圖</li>
          <li>使用 SeedDance 將靜態圖轉為影片</li>
        </ol>
      </div>
    </div>
  );
}
