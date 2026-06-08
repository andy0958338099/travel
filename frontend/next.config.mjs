/** @type {import('next').NextConfig} */
// 2026-06-08 聖旨 A — 試 output: "standalone" 縮減 Netlify function package
// size。root cause 假設: AWS Lambda 拒絕 "___netlify-server-handler"
// (LLM 第二建議: "Using Next.js standalone output or other build
// configuration to avoid bundling all node_modules into the server
// function")。Next.js standalone 模式只打包 runtime 需要的 node_modules
// 子集進 .next/standalone/,預期 function 從 ~50-100MB 縮到 ~5-20MB。
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
