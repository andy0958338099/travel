import aiohttp
import os
from dotenv import load_dotenv

# 載入 .env 檔案
load_dotenv()


class MiniMaxVideoService:
    """MiniMax AI 影片生成服務"""
    
    API_URL = os.environ.get("MINIMAX_API_URL", "https://api.minimax.io")
    API_KEY = os.environ.get("MINIMAX_API_KEY", "")
    GROUP_ID = os.environ.get("MINIMAX_GROUP_ID", "")

    async def generate_video(
        self,
        prompt: str,
        input_image_path: str = None,
        duration: int = 5,
        model: str = "video-01"
    ) -> dict:
        """使用 MiniMax API 生成影片"""
        
        if not self.API_KEY or not self.GROUP_ID:
            return {
                "status": "error",
                "error": "MINIMAX_API_KEY or MINIMAX_GROUP_ID not set",
                "mock": True,
                "prompt": prompt
            }

        headers = {
            "Authorization": f"Bearer {self.API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "prompt": prompt,
            "duration": duration
        }

        # 如果有輸入圖片（用於 img2vid），先上傳
        if input_image_path:
            image_url = await self._upload_image(input_image_path)
            if image_url:
                payload["first_frame_image"] = image_url

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.API_URL}/v1/video_generation",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=900)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        return {
                            "status": "success",
                            "data": result,
                            "prompt": prompt,
                            "duration": duration
                        }
                    else:
                        error_text = await resp.text()
                        return {
                            "status": "error",
                            "error": f"API error {resp.status}: {error_text}"
                        }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }

    async def query_video_status(self, task_id: str) -> dict:
        """查詢影片生成狀態"""
        
        if not self.API_KEY:
            return {"status": "error", "error": "MINIMAX_API_KEY not set"}

        headers = {
            "Authorization": f"Bearer {self.API_KEY}"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.API_URL}/v1/video_generation/{task_id}",
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    else:
                        return {"status": "error", "error": f"HTTP {resp.status}"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def _upload_image(self, image_path: str) -> str:
        """上傳圖片並返回 URL（Base64 編碼）"""
        import base64
        
        if not os.path.exists(image_path):
            return None

        try:
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode()
        except Exception:
            return None

        headers = {
            "Authorization": f"Bearer {self.API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "image-01",
            "images": [image_data]
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.API_URL}/v1/image_generation",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        images = result.get("data", [])
                        if images:
                            return images[0].get("url") or images[0].get("base64_image")
        except Exception:
            pass
        return None


# 向後相容性別名
VideoService = MiniMaxVideoService
