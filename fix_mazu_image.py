import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 替換成有效的寺廟圖片
old_url = "https://images.unsplash.com/photo-1597655605378-99c1b5a7be5d?w=800&h=500&fit=crop"
new_url = "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&h=500&fit=crop"

content = content.replace(old_url, new_url)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已替換成有效的寺廟圖片")
