import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 修復大甲媽卡片
old_mazu = '''<div class="card-image" style="background: linear-gradient(135deg, rgba(44,24,16,0.8) 0%, rgba(139,111,71,0.9) 100%), url('https://images.unsplash.com/photo-1597655605378-99c1b5a7be5d?w=800&h=500&fit=crop') center/cover no-repeat;">
                    <span class="card-badge">🌸 台灣</span>
                </div>'''

new_mazu = '''<div class="card-image" style="background-image: url('https://images.unsplash.com/photo-1597655605378-99c1b5a7be5d?w=800&h=500&fit=crop'); background-size: cover; background-position: center; min-height: 280px;">
                    <span class="card-badge" style="position: absolute; top: 15px; left: 15px; z-index: 2;">🌸 台灣</span>
                </div>'''

content = content.replace(old_mazu, new_mazu)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修復大甲媽卡片")
