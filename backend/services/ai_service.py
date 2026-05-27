"""
AI Service - 使用 MiniMax 進行文字生成
"""
import os
import json
import httpx
from typing import Optional

class AIService:
    """AI 服務 - 整合 MiniMax API"""

    def __init__(self):
        self.api_key = os.getenv("MINIMAX_API_KEY", "")
        self.base_url = os.getenv("MINIMAX_API_BASE", "https://api.minimax.io")

    async def generate_text(self, prompt: str, system_prompt: str = "", max_tokens: int = 500) -> Optional[str]:
        """使用 MiniMax API 生成文字"""

        if not self.api_key:
            print("Warning: MINIMAX_API_KEY not set, using local generation")
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": "MiniMax-Text-01",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/text/chatcompletion_v2",
                    headers=headers,
                    json=payload
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "")
                else:
                    print(f"API Error: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            print(f"Request failed: {e}")
            return None

    def generate_diary_with_story_context(self, char: dict, story_state: dict, direction: str) -> dict:
        """
        根據故事狀態生成日記內容
        這是一個同步版本，包裝了異步方法
        """

        char_name = char.get("name", "")
        job = char.get("job", "")
        relationships = story_state.get("relationships", {})
        mood_history = story_state.get("mood_history", [])
        recent_events = story_state.get("recent_events", [])
        diary_count = story_state.get("diary_count", 0)
        story_progress = story_state.get("story_progress", "early")

        # 構建故事上下文
        context_parts = [
            f"角色：{char_name}",
            f"職業：{job}",
            f"角色關係：{', '.join([f'{k}:{v}' for k, v in relationships.items()])}" if relationships else "尚無明確關係",
            f"故事進度：{story_progress}（{'剛開始' if story_progress == 'early' else '中期' if story_progress == 'middle' else '後期'}）",
            f"目前日記數：{diary_count}篇",
        ]

        if mood_history:
            moods = [m.get("mood", "") for m in mood_history[:3] if m.get("mood")]
            context_parts.append(f"近期情緒：{', '.join(moods)}")

        if recent_events:
            events = [f"{e.get('who', '')}的{e.get('what', '')}" for e in recent_events[:3]]
            context_parts.append(f"相關事件：{'; '.join(events)}")

        story_context = "\n".join(context_parts)

        # 根據方向定義生成提示
        direction_prompts = {
            "love": f"""根據以下故事上下文，以{char_name}的第一人稱視角，撰寫一篇完整的日記。

故事上下文：
{story_context}

要求：
1. 內容要與故事上下文呼應，引用相關角色和事件
2. 暗戀對象是{relationships.get('暗戀', '某人')}，表達暗戀的心境
3. 篇幅 300-500 字
4. 情感要細膩真實
5. 不要使用「或午」這個詞

輸出格式（JSON）：
{{"title": "標題", "content": "日記內容", "mood": "情緒標籤", "mood_value": "mood值", "weather": "天氣", "location": "地點", "tags": ["標籤1", "標籤2"]}}""",

            "work": f"""根據以下故事上下文，以{char_name}的第一人稱視角，撰寫一篇關於工作的日記。

故事上下文：
{story_context}

要求：
1. 內容要與工作相關，可以提到與同事的互動
2. 篇幅 300-500 字
3. 情感要真實
4. 不要使用「或午」這個詞

輸出格式（JSON）：
{{"title": "標題", "content": "日記內容", "mood": "情緒標籤", "mood_value": "mood值", "weather": "天氣", "location": "地點", "tags": ["標籤1", "標籤2"]}}""",

            "friendship": f"""根據以下故事上下文，以{char_name}的第一人稱視角，撰寫一篇關於友情的日記。

故事上下文：
{story_context}

要求：
1. 內容要與友情相關，提到與摯友{relationships.get('摯友', '朋友')}的互動
2. 篇幅 300-500 字
3. 情感要溫馨真實
4. 不要使用「或午」這個詞

輸出格式（JSON）：
{{"title": "標題", "content": "日記內容", "mood": "情緒標籤", "mood_value": "mood值", "weather": "天氣", "location": "地點", "tags": ["標籤1", "標籤2"]}}""",

            "daily": f"""根據以下故事上下文，以{char_name}的第一人稱視角，撰寫一篇日常隨想的日記。

故事上下文：
{story_context}

要求：
1. 內容輕鬆日常，記錄生活中的小確幸
2. 篇幅 300-500 字
3. 情感平靜舒緩
4. 不要使用「或午」這個詞

輸出格式（JSON）：
{{"title": "標題", "content": "日記內容", "mood": "情緒標籤", "mood_value": "mood值", "weather": "天氣", "location": "地點", "tags": ["標籤1", "標籤2"]}}""",
        }

        prompt = direction_prompts.get(direction, direction_prompts["daily"])

        # 嘗試使用 MiniMax API
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        result = loop.run_until_complete(self.generate_text(prompt, max_tokens=800))

        if result:
            try:
                # 嘗試解析 JSON
                start = result.find("{")
                end = result.rfind("}") + 1
                if start != -1 and end != 0:
                    json_str = result[start:end]
                    return json.loads(json_str)
            except json.JSONDecodeError:
                pass

        # 如果 API 失敗或解析失敗，返回 None 讓調用方使用本地生成
        return None
