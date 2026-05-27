import aiohttp
import asyncio
import os
import base64
from pathlib import Path
import time
from dotenv import load_dotenv

# 載入 .env 檔案
load_dotenv()


class MiniMaxService:
    """MiniMax AI 圖片生成服務"""
    
    API_URL = os.environ.get("MINIMAX_API_URL", "https://api.minimax.io")
    API_KEY = os.environ.get("MINIMAX_API_KEY", "")

    def __init__(self):
        if not self.API_KEY:
            print("Warning: MINIMAX_API_KEY not set")

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        model: str = "image-01",
        aspect_ratio: str = "1:1",
        num_images: int = 1
    ) -> dict:
        """使用 MiniMax API 生成圖片
        
        Args:
            prompt: 圖片描述
            negative_prompt: 負面提示詞（目前 MiniMax 不支援，會忽略）
            model: 模型名稱，預設 image-01
            aspect_ratio: 寬高比，如 "1:1", "16:9", "9:16"
            num_images: 生成數量（目前 MiniMax 預設1張）
        
        Returns:
            包含 status, image_base64 或 image_url, prompt 等欄位
        """
        
        if not self.API_KEY:
            return {
                "status": "error",
                "error": "MINIMAX_API_KEY not set"
            }

        headers = {
            "Authorization": f"Bearer {self.API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "response_format": "base64"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.API_URL}/v1/image_generation",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120),
                    ssl=False
                ) as resp:
                    response_text = await resp.text()
                    
                    if resp.status == 200:
                        result = await resp.json()
                        images = result.get("data", {}).get("image_base64", [])
                        
                        if images:
                            return {
                                "status": "success",
                                "images": images,  # Base64 編碼的圖片陣列
                                "prompt": prompt,
                                "model": model,
                                "aspect_ratio": aspect_ratio
                            }
                        else:
                            return {
                                "status": "error",
                                "error": "No images in response",
                                "response": result
                            }
                    else:
                        return {
                            "status": "error",
                            "error": f"API error {resp.status}: {response_text}"
                        }
        except asyncio.TimeoutError:
            return {
                "status": "error",
                "error": "Request timeout (120s)"
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }

    async def generate_with_reference(
        self,
        prompt: str,
        reference_images: list,
        model: str = "image-01",
        aspect_ratio: str = "1:1"
    ) -> dict:
        """使用參考圖片生成（保持角色一致性）
        
        Args:
            prompt: 圖片描述
            reference_images: 參考圖片 URL 列表
            model: 模型名稱
            aspect_ratio: 寬高比
        """
        
        if not self.API_KEY:
            return {
                "status": "error",
                "error": "MINIMAX_API_KEY not set"
            }

        headers = {
            "Authorization": f"Bearer {self.API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "response_format": "base64",
            "reference_image_urls": reference_images if reference_images else None
        }

        # 移除 None 值
        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.API_URL}/v1/image_generation",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120),
                    ssl=False
                ) as resp:
                    response_text = await resp.text()
                    
                    if resp.status == 200:
                        result = await resp.json()
                        images = result.get("data", {}).get("image_base64", [])
                        
                        return {
                            "status": "success",
                            "images": images,
                            "prompt": prompt,
                            "reference_images": reference_images
                        }
                    else:
                        return {
                            "status": "error",
                            "error": f"API error {resp.status}: {response_text}"
                        }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }

    def save_images(self, images: list, output_dir: Path, prefix: str = "generated") -> list:
        """儲存 base64 圖片到硬碟
        
        Args:
            images: base64 編碼的圖片列表
            output_dir: 輸出目錄
            prefix: 檔案前綴
        
        Returns:
            儲存的檔案路徑列表
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        saved_paths = []
        
        for i, img_base64 in enumerate(images):
            try:
                img_data = base64.b64decode(img_base64)
                filename = f"{prefix}_{int(time.time())}_{i}.png"
                filepath = output_dir / filename
                with open(filepath, "wb") as f:
                    f.write(img_data)
                saved_paths.append(str(filepath))
            except Exception as e:
                print(f"Error saving image {i}: {e}")
        
        return saved_paths


# 向後相容性別名
ComfyService = MiniMaxService
