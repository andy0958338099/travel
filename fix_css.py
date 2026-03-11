import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 修復 .card-image CSS
old_css = '''.card-image {
            height: 200px;
            background-size: cover;
            background-position: center;
            position: relative;
        }'''

new_css = '''.card-image {
            height: 280px;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            position: relative;
            background-color: #2c1810;
        }'''

content = content.replace(old_css, new_css)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已修復 CSS")
