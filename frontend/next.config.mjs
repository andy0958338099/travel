/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2026-06-14 修 Netlify function 250MB cap 撞牆
  // (聖上 6-14 報: ___netlify-server-handler 超 250MB, framework 234M 預設 + client lib 41M + 8 PNG 14M = 289M)
  // 排除 client-only lib (只在 "use client" 組件用, 不該進 server function) + 8 個 fallback PNG
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/jspdf/**",
      "./node_modules/html2canvas/**",
      "./node_modules/leaflet/**",
      "./node_modules/react-leaflet/**",
      "./node_modules/canvg/**",
      "./node_modules/dompurify/**",
      "./node_modules/core-js/**",
      "./node_modules/raf/**",
      "./node_modules/performance-now/**",
      "./node_modules/tiny-inflate/**",
      "./node_modules/promise-polyfill/**",
      "./node_modules/whatwg-fetch/**",
      "./node_modules/fetch-polyfill/**",
      "./node_modules/css-line-break/**",
      "./node_modules/dijkstrajs/**",
      "./node_modules/fflate/**",
      "./node_modules/text-segmentation/**",
      "./node_modules/linebreak/**",
      "./node_modules/rgbcolor/**",
      "./node_modules/stackblur-canvas/**",
      "./node_modules/big.js/**",
      "./public/postcard-images/**",  // 8 個 fallback PNG (中堂 6-14 預生成的, ClientPage IndexedDB 空時 fetch 即可, 不該進 server bundle)
    ],
  },
};

export default nextConfig;
