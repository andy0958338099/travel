import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 🆕 2026-08-14 聖上拍板: expose globals.css 的 jn-* CSS vars 給 Tailwind utility
        // (沒這行 bg-jn-gold-light / text-jn-ink / border-jn-vermilion 都是空 class → 看不到)
        //
        // 🆕 2026-11-13 修正: 原本寫成 "var(--jn-ink)"，但 Tailwind v3 無法對
        // 純 var() 形式的顏色套用透明度修飾符 → text-jn-ink/85 之類的 class
        // 完全不會產生 CSS（實測 .text-jn-ink\/85 規則不存在），文字退回繼承 body 顏色。
        // 全站有 100+ 處使用 (text|bg|border|ring|from|via|to)-jn-*/NN，全部失效。
        //
        // 解法: 用 rgb(var(--jn-ink-rgb) / <alpha-value>) 形式，
        // globals.css 另存一份 --jn-*-rgb: R G B 三元組變數。
        "jn-vermilion": "rgb(var(--jn-vermilion-rgb) / <alpha-value>)",
        "jn-vermilion-deep": "rgb(var(--jn-vermilion-deep-rgb) / <alpha-value>)",
        "jn-gold": "rgb(var(--jn-gold-rgb) / <alpha-value>)",
        "jn-gold-light": "rgb(var(--jn-gold-light-rgb) / <alpha-value>)",
        "jn-ink": "rgb(var(--jn-ink-rgb) / <alpha-value>)",
        "jn-paper": "rgb(var(--jn-paper-rgb) / <alpha-value>)",
        "jn-paper-warm": "rgb(var(--jn-paper-warm-rgb) / <alpha-value>)",
        "jn-blue": "rgb(var(--jn-blue-rgb) / <alpha-value>)",
        "jn-mint": "rgb(var(--jn-mint-rgb) / <alpha-value>)",
        "jn-mint-deep": "rgb(var(--jn-mint-deep-rgb) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
export default config;
