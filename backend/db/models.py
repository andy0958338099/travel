from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class Character(BaseModel):
    id: Optional[int] = None
    character_number: Optional[str] = None  # 角色編號 (C001, C002, ...)
    name: str
    gender: str = "female"  # 性別: male, female (女性才能寫日記)
    description: str = ""
    # 核心不變特徵（確保一致性）
    core_features: str = ""
    # 錨點特徵（痣、酒窩、胎記等）
    anchor_features: str = ""
    # 預設穿著
    default_outfit: str = ""
    # 可用穿著列表（JSON 陣列）
    outfit_options: str = "[]"
    # 可用表情
    expression_options: str = "[]"
    # 髮型
    hairstyle: str = ""
    # 膚色描述
    skin_tone: str = ""
    # 風格
    style: str = "photorealistic"
    # Lora 路徑
    lora_path: Optional[str] = None
    # 參考 Seed
    seed: Optional[int] = None
    # 音樂相關屬性
    music_genre: str = "pop"  # 音樂類型: pop, ballad, rock, electronic, jazz, classical, etc.
    music_mood: str = "warm"  # 音樂情緒: warm, energetic, melancholic, dreamy, elegant, etc.
    music_tempo: str = "medium"  # 節奏: slow, medium, fast
    voice_description: str = ""  # 音色描述:甜美,低沉,清新,磁性, etc.
    theme_tags: str = "[]"  # 主題標籤: ["少女", "活潑", "愛情", etc.]
    created_at: Optional[datetime] = None


class Scene(BaseModel):
    id: Optional[int] = None
    name: str
    description: str = ""
    # 場景 Prompt 模板（可用變量）
    prompt_template: str = ""  
    # 背景圖路徑
    background_path: Optional[str] = None
    # 風格
    style: str = "anime"
    created_at: Optional[datetime] = None


class Episode(BaseModel):
    id: Optional[int] = None
    title: str
    script: str = ""
    status: str = "draft"
    created_at: Optional[datetime] = None


class GenerationJob(BaseModel):
    id: Optional[int] = None
    episode_id: Optional[int] = None
    character_id: Optional[int] = None
    scene_id: Optional[int] = None
    prompt: str
    seed: int = -1
    status: str = "pending"
    output_path: Optional[str] = None
    created_at: Optional[datetime] = None


class GenerationRequest(BaseModel):
    character_id: int
    scene_id: int
    prompt: str
    episode_id: Optional[int] = None
    seed: Optional[int] = None
    outfit: Optional[str] = None  # 指定穿著
    expression: Optional[str] = None  # 指定表情
    aspect_ratio: str = "1:1"


class CharacterGenerateRequest(BaseModel):
    """角色生成請求"""
    name: str
    # 核心特徵（必填，確保一致性）
    core_features: str
    # 錨點特徵（可選，強烈建議填寫）
    anchor_features: str = ""
    # 預設穿著
    default_outfit: str = ""
    # 可用穿著選項（陣列）
    outfit_options: List[str] = []
    # 可用表情選項（陣列）
    expression_options: List[str] = []
    # 髮型描述
    hairstyle: str = ""
    # 膚色描述
    skin_tone: str = ""
    # 風格
    style: str = "photorealistic"
    # 寬高比
    aspect_ratio: str = "1:1"
    # 是否使用參考圖（可選）
    use_reference: bool = False
    # 參考圖片 URL 或路徑（base64 或本地路徑）
    reference_image: Optional[str] = None


class SceneGenerateRequest(BaseModel):
    """場景生成請求"""
    name: str
    description: str = ""
    # Prompt 模板（可用變量如 {action}, {outfit}）
    prompt_template: str = ""
    style: str = "anime"
    aspect_ratio: str = "16:9"
