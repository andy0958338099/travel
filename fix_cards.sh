#!/bin/bash
# 替換大甲媽卡片
sed -i 's|<div class="card-image" style="background: linear-gradient(135deg, rgba(44,24,16,0.8) 0%, rgba(139,111,71,0.9) 100%), url.*<span class="card-badge">🌸 台灣</span>|<div class="card-image" style="position: relative; overflow: hidden;"><img src="https://images.unsplash.com/photo-1597655605378-99c1b5a7be5d?w=800&h=500&fit=crop" alt="大甲媽" style="width:100%;height:100%;object-fit:cover;"><span class="card-badge" style="position:absolute;top:15px;left:15px;z-index:2;">🌸 台灣</span>|g' index.html
