#!/bin/bash
# GitHub Pages 部署腳本

cd "$(dirname "$0")"

echo "🚀 正在推送到 GitHub..."

# 確保在 main branch
git branch -M main

# 推送到 GitHub
# 注意：需要先設定 GitHub 認證
# 可以使用以下方式之一：
# 1. gh auth login
# 2. 設定 GIT_ASKPASS 或使用 credential helper
# 3. 使用 SSH URL: git@github.com:andy0958338099/travel.git

echo "請先確保 GitHub 認證已設定，然後執行："
echo "git push -u origin main"