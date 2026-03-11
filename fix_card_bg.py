import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 修復大甲媽卡片 - 讓圖片在漸變層下面
old_mazu = '''<div class="card-image" style="background-image: url('https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&h=500&fit=crop'); background-size: cover; background-position: center; min-height: 280px;">
                    <span class="card-badge" style="position: absolute; top: 15px; left: 15px; z-index: 2;">🌸 台灣</span>
                </div>'''

new_mazu = '''<div class="card-image" style="background: linear-gradient(135deg, rgba(44,24,16,0.7) 0%, rgba(139,111,71,0.8) 100%), url('https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&h=500&fit=crop'); background-size: cover; background-position: center; min-height: 280px;">
                    <span class="card-badge" style="position: absolute; top: 15px; left: 15px; z-index: 2;">🌸 台灣</span>
                </div>'''

content = content.replace(old_mazu, new_mazu)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修復大甲媽卡片背景")
