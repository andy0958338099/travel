import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 修復 CSS - 確保 .card-image 有正確的樣式
old_css = '''.card-image {
            height: 280px;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            position: relative;
            background-color: #2c1810;
        }'''

new_css = '''.card-image {
            height: 280px;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            position: relative;
            background-color: #2c1810;
            overflow: hidden;
            border-radius: 20px 20px 0 0;
        }'''

content = content.replace(old_css, new_css)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修復 CSS")
