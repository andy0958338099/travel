import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 替換普吉島圖片（失效 → 有效）
old_phuket = "https://images.unsplash.com/photo-1537655784934-ff0550d6a7e2?w=800&h=500&fit=crop"
new_phuket = "https://images.unsplash.com/photo-1507525428034-b723cf961d9e?w=800&h=500&fit=crop"
content = content.replace(old_phuket, new_phuket)

# 替換張家界圖片（如果有問題）
old_zhang = "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&h=500&fit=crop"
new_zhang = "https://images.unsplash.com/photo-1542662565-7e5fb6561e11?w=800&h=500&fit=crop"
content = content.replace(old_zhang, new_zhang)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修復所有卡片圖片")
print(f"普吉島：{old_phuket} → {new_phuket}")
print(f"張家界：{old_zhang} → {new_zhang}")
