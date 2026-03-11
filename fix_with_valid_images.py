import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 使用真正有效的 Unsplash 圖片
# 普吉島 - 海灘圖片
old_phuket = "https://images.unsplash.com/photo-1507525428034-b723cf961d9e?w=800&h=500&fit=crop"
new_phuket = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&fit=crop"  # 山脈風景
content = content.replace(old_phuket, new_phuket)

# 張家界 - 山景圖片
old_zhang = "https://images.unsplash.com/photo-1542662565-7e5fb6561e11?w=800&h=500&fit=crop"
new_zhang = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop"  # 山脈
content = content.replace(old_zhang, new_zhang)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已更新為有效圖片")
