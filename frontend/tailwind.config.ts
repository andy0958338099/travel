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
        "jn-vermilion": "var(--jn-vermilion)",
        "jn-vermilion-deep": "var(--jn-vermilion-deep)",
        "jn-gold": "var(--jn-gold)",
        "jn-gold-light": "var(--jn-gold-light)",
        "jn-ink": "var(--jn-ink)",
        "jn-paper": "var(--jn-paper)",
        "jn-paper-warm": "var(--jn-paper-warm)",
      },
    },
  },
  plugins: [],
};
export default config;
