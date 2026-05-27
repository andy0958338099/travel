from pathlib import Path
from db.database import get_connection
import shutil


class AssetManager:
    ASSETS_ROOT = Path(__file__).parent.parent.parent / "assets"

    @staticmethod
    def get_character_dir(char_id: int) -> Path:
        path = AssetManager.ASSETS_ROOT / "characters" / str(char_id)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def get_scene_dir(scene_id: int) -> Path:
        path = AssetManager.ASSETS_ROOT / "scenes" / str(scene_id)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def get_lora_dir() -> Path:
        path = AssetManager.ASSETS_ROOT / "loras"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def get_styles_dir() -> Path:
        path = AssetManager.ASSETS_ROOT / "styles"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def list_character_assets(char_id: int) -> list:
        char_dir = AssetManager.get_character_dir(char_id)
        return [str(f) for f in char_dir.iterdir() if f.is_file()]

    @staticmethod
    def list_loras() -> list:
        lora_dir = AssetManager.get_lora_dir()
        return [{"name": f.stem, "path": str(f)} for f in lora_dir.iterdir() if f.is_file()]
