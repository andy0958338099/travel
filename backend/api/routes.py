from fastapi import APIRouter, HTTPException, UploadFile, File, Body
from db.database import get_connection, init_db, get_next_character_number, MAX_IMAGES_PER_CHARACTER
from db.models import (
    Character, Scene, Episode, GenerationJob, GenerationRequest,
    CharacterGenerateRequest, SceneGenerateRequest
)
from services.asset_manager import AssetManager
from services.comfy_service import MiniMaxService
from services.video_service import MiniMaxVideoService
from services.music_service import MiniMaxMusicService
import shutil
from pathlib import Path
import base64
import time
import json
import random

router = APIRouter()
init_db()

# 使用外接硬碟路徑
EXTERNAL_DRIVE = Path("/Volumes/Transcend/manga-studio")
ASSETS_DIR = EXTERNAL_DRIVE / "assets"
OUTPUT_DIR = EXTERNAL_DRIVE / "outputs"
SONGS_DIR = EXTERNAL_DRIVE / "data" / "songs"
IMAGES_DIR = EXTERNAL_DRIVE / "data" / "images"

ASSETS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SONGS_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


# === Character Routes ===

@router.get("/characters/gallery")
def list_characters_gallery():
    """取得所有角色的圖集摘要 (用於角色選擇) """
    conn = get_connection()
    cursor = conn.cursor()

    rows = cursor.execute("""
        SELECT c.*,
               (SELECT ci.image_path FROM character_images ci
                WHERE ci.character_id = c.id
                ORDER BY ci.created_at DESC LIMIT 1) as latest_image,
               (SELECT COUNT(*) FROM character_images ci
                WHERE ci.character_id = c.id) as image_count
        FROM characters c
        ORDER BY c.character_number ASC
    """).fetchall()
    conn.close()

    result = []
    for row in rows:
        char = dict(row)
        # 解析 JSON 欄位
        for field in ["outfit_options", "expression_options"]:
            if field in char and char[field]:
                try:
                    char[field] = json.loads(char[field])
                except:
                    char[field] = []
        result.append(char)

    return result


@router.get("/characters")
def list_characters():
    """取得所有角色 (管理用) """
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM characters ORDER BY character_number ASC").fetchall()
    result = []
    for row in rows:
        char = dict(row)
        # 取得圖片數量
        img_count = cursor.execute(
            "SELECT COUNT(*) FROM character_images WHERE character_id = ?", (char["id"],)
        ).fetchone()[0]
        char["image_count"] = img_count
        char["max_images"] = 20
        # 解析 JSON 欄位
        for field in ["outfit_options", "expression_options"]:
            if field in char and char[field]:
                try:
                    char[field] = json.loads(char[field])
                except:
                    char[field] = []
        result.append(char)
    conn.close()
    return result


@router.post("/characters")
def create_character(char: Character):
    conn = get_connection()
    cursor = conn.cursor()
    
    # 自動生成角色編號
    character_number = get_next_character_number()
    
    outfit_options = char.outfit_options if isinstance(char.outfit_options, str) else json.dumps(char.outfit_options or [])
    expression_options = char.expression_options if isinstance(char.expression_options, str) else json.dumps(char.expression_options or [])
    
    cursor.execute(
        """INSERT INTO characters (character_number, name, description, core_features, anchor_features, 
           default_outfit, outfit_options, expression_options, hairstyle, skin_tone, style, lora_path, seed) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (character_number, char.name, char.description, char.core_features, char.anchor_features,
         char.default_outfit, outfit_options, expression_options,
         char.hairstyle, char.skin_tone, char.style, char.lora_path, char.seed)
    )
    conn.commit()
    char_id = cursor.lastrowid
    conn.close()
    return {"id": char_id, "character_number": character_number, **char.dict(exclude_none=True)}


@router.get("/characters/female")
def list_female_characters():
    """取得所有女性角色 (只有女性才能寫日記) """
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("""
        SELECT c.*,
               (SELECT COUNT(*) FROM character_diaries d WHERE d.character_id = c.id) as diary_count
        FROM characters c
        WHERE c.gender = 'female'
        ORDER BY c.character_number ASC
    """).fetchall()
    result = []
    for row in rows:
        char = dict(row)
        # 解析 JSON 欄位
        for field in ["outfit_options", "expression_options", "theme_tags"]:
            if field in char and char[field]:
                try:
                    char[field] = json.loads(char[field])
                except:
                    char[field] = []
        result.append(char)
    conn.close()
    return result


@router.get("/characters/{char_id}")
def get_character(char_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")
    
    char = dict(row)
    # 取得圖片數量
    img_count = cursor.execute(
        "SELECT COUNT(*) FROM character_images WHERE character_id = ?", (char_id,)
    ).fetchone()[0]
    char["image_count"] = img_count
    char["max_images"] = 20
    
    conn.close()
    for field in ["outfit_options", "expression_options"]:
        if field in char and char[field]:
            try:
                char[field] = json.loads(char[field])
            except:
                char[field] = []
    return char


@router.delete("/characters/{char_id}")
def delete_character(char_id: int):
    """刪除角色及其所有圖片"""
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)

    # 刪除 character_images 表中的圖片記錄 (使用 ON DELETE CASCADE 應該會自動刪除,但先手動刪除) 
    cursor.execute("DELETE FROM character_images WHERE character_id = ?", (char_id,))

    # 刪除角色
    cursor.execute("DELETE FROM characters WHERE id = ?", (char_id,))

    conn.commit()
    conn.close()

    # 嘗試刪除實際的圖片檔案
    deleted_files = []
    if char.get("image_path"):
        try:
            Path(char["image_path"]).unlink(missing_ok=True)
            deleted_files.append(char["image_path"])
        except:
            pass

    # 刪除角色目錄
    char_dir = ASSETS_DIR / "characters" / str(char_id)
    if char_dir.exists():
        try:
            shutil.rmtree(char_dir)
        except:
            pass

    return {
        "message": f"角色 {char.get('name', char_id)} 已刪除",
        "character_id": char_id,
        "character_number": char.get("character_number"),
        "deleted_files": deleted_files
    }


@router.get("/characters/{char_id}/images")
def get_character_images(char_id: int):
    """取得角色的所有圖片"""
    conn = get_connection()
    cursor = conn.cursor()
    # 確認角色存在
    row = cursor.execute("SELECT id FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    images = cursor.execute(
        "SELECT * FROM character_images WHERE character_id = ? ORDER BY created_at DESC",
        (char_id,)
    ).fetchall()
    conn.close()
    return [dict(img) for img in images]


@router.delete("/characters/{char_id}/images/{image_id}")
def delete_character_image(char_id: int, image_id: int):
    """刪除角色的單張圖片
    
    Args:
        char_id: 角色 ID
        image_id: 圖片 ID
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # 確認角色存在
    char_row = cursor.execute("SELECT id FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")
    
    # 確認圖片存在
    img_row = cursor.execute(
        "SELECT * FROM character_images WHERE id = ? AND character_id = ?",
        (image_id, char_id)
    ).fetchone()
    if not img_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Image not found")
    
    img = dict(img_row)
    image_path = img.get("image_path")
    
    # 刪除資料庫記錄
    cursor.execute("DELETE FROM character_images WHERE id = ?", (image_id,))
    conn.commit()
    conn.close()
    
    # 刪除實際檔案
    deleted_file = False
    if image_path:
        try:
            Path(image_path).unlink(missing_ok=True)
            deleted_file = True
        except:
            pass
    
    return {
        "message": "圖片已刪除",
        "image_id": image_id,
        "character_id": char_id,
        "file_deleted": deleted_file
    }


@router.get("/characters/{char_id}/gallery")
def get_character_gallery(char_id: int, type: str = None):
    """取得角色的圖集 (可依類型篩選) 

    Args:
        char_id: 角色 ID
        type: 篩選類型 (outfit, expression, angle),可選
    """
    conn = get_connection()
    cursor = conn.cursor()

    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)

    # 查詢圖片
    if type:
        # 依據類型篩選 (variant_info 中的欄位) 
        images = cursor.execute(
            """SELECT * FROM character_images
               WHERE character_id = ? AND variant_info LIKE ?
               ORDER BY created_at DESC""",
            (char_id, f'%"{type}"%')
        ).fetchall()
    else:
        images = cursor.execute(
            "SELECT * FROM character_images WHERE character_id = ? ORDER BY created_at DESC",
            (char_id,)
        ).fetchall()

    conn.close()

    # 解析 variant_info 並附加到圖片
    result_images = []
    for img in images:
        img_dict = dict(img)
        if img_dict.get("variant_info"):
            try:
                img_dict["variant_info"] = json.loads(img_dict["variant_info"])
            except:
                img_dict["variant_info"] = {}
        result_images.append(img_dict)

    return {
        "character": {
            "id": char["id"],
            "character_number": char.get("character_number"),
            "name": char["name"],
            "core_features": char.get("core_features", ""),
            "anchor_features": char.get("anchor_features", ""),
            "style": char.get("style", "photorealistic"),
        },
        "images": result_images,
        "total_count": len(result_images),
        "filter_type": type
    }


@router.post("/characters/{char_id}/upload")
async def upload_character_image(char_id: int, file: UploadFile = File(...)):
    char_dir = ASSETS_DIR / "characters" / str(char_id)
    char_dir.mkdir(parents=True, exist_ok=True)

    file_path = char_dir / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"path": str(file_path), "filename": file.filename}


def build_character_prompt(char: dict, outfit: str = None, expression: str = None, angle: str = None) -> str:
    """建構角色 Prompt
    
    組合順序: 
    1. 風格 + 攝影參數
    2. 核心特徵 (臉部結構、年齡 — 真正固定不變) 
    3. 錨點特徵 (痣, 酒窩等 — 確保同一人物) 
    4. 髮型 (可調整)
    5. 膚色 (可調整)
    6. 穿著 (可調整)
    7. 表情 (可調整)
    8. 角度 (可調整)
    """
    parts = []
    
    # 1. 風格
    style = char.get("style", "photorealistic")
    if style == "photorealistic":
        parts.append("photorealistic, shot on 35mm lens, f/1.8, natural lighting, 8k resolution, cinematic")
    elif style == "anime":
        parts.append("anime style, high quality illustration")
    else:
        parts.append(f"{style} style")
    
    # 2. 核心特徵 (最重要,確保長相一致) 
    core = char.get("core_features", "")
    if core:
        parts.append(core)
    
    # 3. 錨點特徵 (細節鎖定) 
    anchor = char.get("anchor_features", "")
    if anchor:
        parts.append(anchor)
    
    # 4. 髮型
    hair = char.get("hairstyle", "")
    if hair:
        parts.append(hair)
    
    # 5. 膚色
    skin = char.get("skin_tone", "")
    if skin:
        parts.append(skin)
    
    # 6. 穿著 (優先使用傳入的 outfit，否則用預設)
    outfit_text = outfit if outfit else char.get("default_outfit", "")
    if outfit_text:
        parts.append(outfit_text)
    
    # 7. 表情
    if expression:
        parts.append(expression)
    
    # 8. 角度
    if angle:
        parts.append(angle)
    
    return ", ".join(parts)


@router.post("/characters/generate")
async def generate_character(req: CharacterGenerateRequest):
    """使用 MiniMax AI 生成角色圖片
    
    支援兩種模式: 
    - 純文字生成 (use_reference=False) : 直接用 prompt 生成
    - 參考圖生成 (use_reference=True) : 用 prompt + 參考圖保持一致性
    """
    mini_max = MiniMaxService()
    
    # 建構 Prompt
    char_data = {
        "style": req.style,
        "core_features": req.core_features,
        "anchor_features": req.anchor_features,
        "hairstyle": req.hairstyle,
        "skin_tone": req.skin_tone,
        "default_outfit": req.default_outfit
    }
    prompt = build_character_prompt(char_data)
    
    # 根據模式選擇生成方式
    if req.use_reference and req.reference_image:
        # 參考圖模式: 需要先轉換為 URL 或 base64
        reference_images = [req.reference_image]
        result = await mini_max.generate_with_reference(
            prompt=prompt,
            reference_images=reference_images,
            aspect_ratio=req.aspect_ratio
        )
    else:
        # 純文字模式
        result = await mini_max.generate_image(
            prompt=prompt,
            aspect_ratio=req.aspect_ratio
        )
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    # 儲存圖片
    images = result.get("images", [])
    saved_paths = []
    
    for i, img_base64 in enumerate(images):
        try:
            img_data = base64.b64decode(img_base64)
            filename = f"char_{req.name}_{int(time.time())}_{i}.png"
            filepath = OUTPUT_DIR / filename
            with open(filepath, "wb") as f:
                f.write(img_data)
            saved_paths.append(str(filepath))
        except Exception as e:
            print(f"Error saving image: {e}")
    
    # 建立角色記錄
    conn = get_connection()
    cursor = conn.cursor()

    # 自動生成角色編號
    character_number = get_next_character_number()

    outfit_options_json = json.dumps(req.outfit_options or [])
    expression_options_json = json.dumps(req.expression_options or [])
    image_path = saved_paths[0] if saved_paths else None

    cursor.execute(
        """INSERT INTO characters (character_number, name, description, core_features, anchor_features,
           default_outfit, outfit_options, expression_options, hairstyle, skin_tone, style, image_path)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (character_number, req.name, "", req.core_features, req.anchor_features, req.default_outfit,
         outfit_options_json, expression_options_json, req.hairstyle, req.skin_tone, req.style, image_path)
    )
    conn.commit()
    char_id = cursor.lastrowid

    # 如果有生成的圖片,儲存到 character_images 表
    if saved_paths:
        for img_path in saved_paths:
            cursor.execute(
                "INSERT INTO character_images (character_id, image_path, variant_info) VALUES (?, ?, ?)",
                (char_id, img_path, json.dumps({}))
            )
        conn.commit()

    conn.close()

    # 如果有生成的圖片,複製到角色目錄
    if saved_paths:
        char_dir = ASSETS_DIR / "characters" / str(char_id)
        char_dir.mkdir(parents=True, exist_ok=True)
        for src_path in saved_paths:
            shutil.copy(src_path, char_dir / Path(src_path).name)

    return {
        "character_id": char_id,
        "character_number": character_number,
        "name": req.name,
        "use_reference": req.use_reference,
        "images": saved_paths,
        "prompt": prompt,
        "prompt_parts": {
            "style": req.style,
            "core_features": req.core_features,
            "anchor_features": req.anchor_features,
            "hairstyle": req.hairstyle,
            "skin_tone": req.skin_tone,
            "outfit": req.default_outfit
        }
    }


@router.post("/characters/{char_id}/generate-variant")
async def generate_character_variant(char_id: int, req: dict):
    """為現有角色生成變體 (換裝/表情/角度) 
    
    使用原有的核心特徵,但替換穿著, 表情或角度
    一次生成多張圖片 (預設 3 張) 
    """
    conn = get_connection()
    cursor = conn.cursor()
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")
    
    # 檢查圖片數量限制
    current_count = cursor.execute(
        "SELECT COUNT(*) FROM character_images WHERE character_id = ?", (char_id,)
    ).fetchone()[0]
    
    num_images = req.get("num_images", 3)
    if current_count + num_images > MAX_IMAGES_PER_CHARACTER:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"角色已達圖片上限 ({MAX_IMAGES_PER_CHARACTER} 張),無法繼續生成.目前有 {current_count} 張,還可生成 {MAX_IMAGES_PER_CHARACTER - current_count} 張."
        )
    
    char = dict(char_row)
    conn.close()
    
    for field in ["outfit_options", "expression_options"]:
        if field in char and char[field]:
            try:
                char[field] = json.loads(char[field])
            except:
                char[field] = []
    
    # 取得參數
    outfit = req.get("outfit")
    expression = req.get("expression")
    angle = req.get("angle", "front view")  # front view, side view, back view, close-up, wide shot
    aspect_ratio = req.get("aspect_ratio", "1:1")
    
    # 建構 Prompt (傳入角度參數)
    prompt = build_character_prompt(char, outfit=outfit, expression=expression, angle=angle)
    
    mini_max = MiniMaxService()
    all_saved_paths = []
    
    errors = []
    
    # 生成多張圖片
    for i in range(num_images):
        try:
            result = await mini_max.generate_image(prompt=prompt, aspect_ratio=aspect_ratio)
            
            if result.get("status") == "error":
                error_msg = result.get("error", "Unknown error")
                errors.append(f"第 {i+1} 張圖片 API 錯誤: {error_msg}")
                print(f"Error generating image {i+1}: {error_msg}")
                continue  # 繼續生成下一張，不要中斷
        except Exception as e:
            errors.append(f"第 {i+1} 張圖片生成異常: {str(e)}")
            print(f"Exception generating image {i+1}: {e}")
            continue
        
        images = result.get("images", [])
        if not images:
            errors.append(f"第 {i+1} 張圖片 API 回應無圖片")
            continue
        
        for j, img_base64 in enumerate(images):
            try:
                img_data = base64.b64decode(img_base64)
                variant_name = f"char_{char.get('character_number', char_id)}_{angle.replace(' ', '_')}_{outfit or 'default'}_{expression or 'neutral'}_{int(time.time())}_{i}_{j}.png"
                filepath = OUTPUT_DIR / variant_name
                with open(filepath, "wb") as f:
                    f.write(img_data)
                
                # 保存到 character_images 表
                conn2 = get_connection()
                cursor2 = conn2.cursor()
                variant_info = json.dumps({
                    "outfit": outfit,
                    "expression": expression,
                    "angle": angle
                })
                cursor2.execute(
                    "INSERT INTO character_images (character_id, image_path, variant_info) VALUES (?, ?, ?)",
                    (char_id, str(filepath), variant_info)
                )
                conn2.commit()
                conn2.close()
                
                all_saved_paths.append(str(filepath))
                print(f"Saved image: {filepath}")
            except Exception as e:
                print(f"Error saving image {i}_{j}: {e}")
                errors.append(f"第 {i+1} 張圖片儲存失敗: {str(e)}")
    
    # 如果有錯誤但至少有一張成功，返回部分成功
    if len(all_saved_paths) == 0 and len(errors) > 0:
        raise HTTPException(
            status_code=500, 
            detail=f"所有圖片生成失敗: {'; '.join(errors)}"
        )
    
    return {
        "character_id": char_id,
        "character_number": char.get("character_number"),
        "variant": {
            "outfit": outfit,
            "expression": expression,
            "angle": angle,
            "num_images": num_images
        },
        "images": all_saved_paths,
        "image_count": current_count + len(all_saved_paths),
        "max_images": MAX_IMAGES_PER_CHARACTER,
        "prompt": prompt,
        "errors": errors if errors else None,
        "message": f"成功生成 {len(all_saved_paths)}/{num_images} 張圖片" if errors else None
    }


# === Scene Routes ===

@router.get("/scenes")
def list_scenes():
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM scenes ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.post("/scenes")
def create_scene(scene: Scene):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO scenes (name, description, prompt_template, background_path, style) VALUES (?, ?, ?, ?, ?)",
        (scene.name, scene.description, scene.prompt_template, scene.background_path, scene.style)
    )
    conn.commit()
    scene_id = cursor.lastrowid
    conn.close()
    return {"id": scene_id, **scene.dict(exclude_none=True)}


@router.post("/scenes/{scene_id}/upload")
async def upload_scene_image(scene_id: int, file: UploadFile = File(...)):
    scene_dir = ASSETS_DIR / "scenes" / str(scene_id)
    scene_dir.mkdir(parents=True, exist_ok=True)

    file_path = scene_dir / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    conn = get_connection()
    conn.execute("UPDATE scenes SET background_path = ? WHERE id = ?", (str(file_path), scene_id))
    conn.commit()
    conn.close()

    return {"path": str(file_path), "filename": file.filename}


def build_scene_prompt(scene: dict, extra: str = "") -> str:
    """建構場景 Prompt"""
    parts = []
    
    # 風格
    style = scene.get("style", "anime")
    if style == "anime":
        parts.append("anime style background")
    elif style == "photorealistic":
        parts.append("photorealistic, cinematic lighting")
    else:
        parts.append(f"{style} style")
    
    # 描述
    desc = scene.get("description", "")
    if desc:
        parts.append(desc)
    
    # Prompt 模板
    template = scene.get("prompt_template", "")
    if template:
        parts.append(template)
    
    # 額外描述
    if extra:
        parts.append(extra)
    
    return ", ".join(parts)


@router.post("/scenes/generate")
async def generate_scene(req: SceneGenerateRequest):
    """使用 MiniMax AI 生成場景背景"""
    mini_max = MiniMaxService()
    
    # 建構 Prompt
    scene_data = {
        "style": req.style,
        "description": req.description,
        "prompt_template": req.prompt_template
    }
    prompt = build_scene_prompt(scene_data)
    
    result = await mini_max.generate_image(
        prompt=prompt,
        aspect_ratio=req.aspect_ratio
    )
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    # 儲存圖片
    images = result.get("images", [])
    saved_paths = []
    
    for i, img_base64 in enumerate(images):
        try:
            img_data = base64.b64decode(img_base64)
            filename = f"scene_{req.name}_{int(time.time())}_{i}.png"
            filepath = OUTPUT_DIR / filename
            with open(filepath, "wb") as f:
                f.write(img_data)
            saved_paths.append(str(filepath))
        except Exception as e:
            print(f"Error saving image: {e}")
    
    # 建立場景記錄
    conn = get_connection()
    cursor = conn.cursor()
    background_path = saved_paths[0] if saved_paths else None
    cursor.execute(
        "INSERT INTO scenes (name, description, prompt_template, style, background_path) VALUES (?, ?, ?, ?, ?)",
        (req.name, req.description, req.prompt_template, req.style, background_path)
    )
    conn.commit()
    scene_id = cursor.lastrowid
    conn.close()
    
    return {
        "scene_id": scene_id,
        "name": req.name,
        "images": saved_paths,
        "prompt": prompt
    }


# === Episode Routes ===

@router.get("/episodes")
def list_episodes():
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM episodes ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.post("/episodes")
def create_episode(episode: Episode):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO episodes (title, script, status) VALUES (?, ?, ?)",
        (episode.title, episode.script, episode.status)
    )
    conn.commit()
    ep_id = cursor.lastrowid
    conn.close()
    return {"id": ep_id, **episode.dict(exclude_none=True)}


@router.get("/episodes/{ep_id}")
def get_episode(ep_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM episodes WHERE id = ?", (ep_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Episode not found")
    return dict(row)


# === Generation Routes ===

@router.post("/generate")
async def generate_frame(req: GenerationRequest):
    """使用 MiniMax AI 生成場景圖片 (角色+場景組合) """
    mini_max = MiniMaxService()

    conn = get_connection()
    char_row = conn.execute("SELECT * FROM characters WHERE id = ?", (req.character_id,)).fetchone()
    scene_row = conn.execute("SELECT * FROM scenes WHERE id = ?", (req.scene_id,)).fetchone()
    conn.close()

    if not char_row:
        raise HTTPException(status_code=404, detail="Character not found")
    if not scene_row:
        raise HTTPException(status_code=404, detail="Scene not found")

    char = dict(char_row)
    scene = dict(scene_row)
    for field in ["outfit_options", "expression_options"]:
        if field in char and char[field]:
            try:
                char[field] = json.loads(char[field])
            except:
                char[field] = []

    # 建構完整 Prompt
    char_prompt = build_character_prompt(char, outfit=req.outfit, expression=req.expression)
    scene_prompt = build_scene_prompt(scene, extra=req.prompt)
    
    # 組合: 角色在場景中
    full_prompt = f"{char_prompt}, {scene_prompt}"

    result = await mini_max.generate_image(
        prompt=full_prompt,
        aspect_ratio="16:9"
    )

    conn = get_connection()
    cursor = conn.cursor()
    
    output_path = None
    job_status = "generating"
    
    if result.get("status") == "success":
        images = result.get("images", [])
        if images:
            try:
                img_data = base64.b64decode(images[0])
                filename = f"gen_{int(time.time())}.png"
                filepath = OUTPUT_DIR / filename
                with open(filepath, "wb") as f:
                    f.write(img_data)
                output_path = str(filepath)
                job_status = "success"
            except Exception as e:
                job_status = "error"
                print(f"Error saving image: {e}")
    
    cursor.execute(
        "INSERT INTO generation_jobs (episode_id, character_id, scene_id, prompt, seed, status, output_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (req.episode_id, req.character_id, req.scene_id, full_prompt, -1, job_status, output_path)
    )
    conn.commit()
    job_id = cursor.lastrowid
    conn.close()

    return {
        "job_id": job_id,
        "status": job_status,
        "result": result,
        "output_path": output_path,
        "prompt": full_prompt,
        "prompt_breakdown": {
            "character": char_prompt,
            "scene": scene_prompt
        }
    }


@router.get("/jobs")
def list_jobs():
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("""
        SELECT j.*, c.name as character_name, s.name as scene_name
        FROM generation_jobs j
        LEFT JOIN characters c ON j.character_id = c.id
        LEFT JOIN scenes s ON j.scene_id = s.id
        ORDER BY j.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.get("/jobs/{job_id}")
def get_job(job_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM generation_jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return dict(row)


# === Video Routes ===

@router.post("/video/generate")
async def generate_video(req: dict):
    """使用 MiniMax AI 生成影片"""
    video_service = MiniMaxVideoService()
    
    result = await video_service.generate_video(
        prompt=req.get("prompt", ""),
        input_image_path=req.get("image_path"),
        duration=req.get("duration", 5)
    )
    
    return result


# === Asset Routes ===

@router.get("/outputs/{filename}")
def get_output_file(filename: str):
    """取得輸出檔案"""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    with open(file_path, "rb") as f:
        img_data = f.read()

    from fastapi.responses import Response
    return Response(content=img_data, media_type="image/png")


# === Music Routes ===

@router.get("/characters/{char_id}/songs")
def get_character_songs(char_id: int):
    """取得角色的所有歌曲"""
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    songs = cursor.execute(
        "SELECT * FROM character_songs WHERE character_id = ? ORDER BY created_at DESC",
        (char_id,)
    ).fetchall()
    conn.close()
    return [dict(song) for song in songs]


@router.post("/characters/{char_id}/songs")
async def generate_character_song(char_id: int, req: dict):
    """
    為角色生成歌曲

    根據角色日記動態生成歌詞，包含：
    - 日記心情與故事
    - 生活環境地點
    - 氣音、口氣唱法
    - 英文點綴
    - 瑣事靈感
    - 獨特聲線
    """
    conn = get_connection()
    cursor = conn.cursor()

    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)

    # 取得參數
    title = req.get("title")
    song_type = req.get("song_type", "theme")  # theme, bgm
    duration = req.get("duration", 60)
    inspiration = req.get("inspiration")  # 額外的靈感描述

    # 取得角色最近的日記（用於生成歌詞）
    diary_rows = cursor.execute("""
        SELECT * FROM character_diaries
        WHERE character_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    """, (char_id,)).fetchall()
    diaries = [dict(row) for row in diary_rows]

    # 根據日記和角色資料生成標題
    if not title and diaries:
        # 取最近的心情來決定標題
        latest_mood = diaries[0].get("mood", "温柔")
        title = f"{char['name']}的{random.choice(['心情', '日常', '時光', '片段'])}"
    elif not title:
        title = f"{char['name']}的主題曲"

    # 創建歌曲記錄
    cursor.execute(
        """INSERT INTO character_songs (character_id, title, song_type, lyrics, duration, status)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (char_id, title, song_type, None, duration, "generating")
    )
    conn.commit()
    song_id = cursor.lastrowid
    conn.close()

    # 調用音樂服務生成歌曲
    music_service = MiniMaxMusicService()
    try:
        # 傳入角色資料和日記，讓 AI 生成歌詞
        result = await music_service.generate_character_theme_song(
            character=char,
            diary_entries=diaries,
            inspiration=inspiration,
            duration=duration
        )

        if result.get("status") == "success":
            # 更新歌曲記錄
            conn = get_connection()
            cursor = conn.cursor()

            # MiniMax API 回應后 的處理（取 audio_url）
            # music_service 返回: {"status": "success", "audio_url": "...", "result": {...}}
            # audio_url 在頂層，不是在 result 裡面
            audio_url = result.get("audio_url") if isinstance(result, dict) else None

            if audio_url:
                # 下載音樂到本地硬碟
                download_result = await music_service.download_audio_to_local(
                    audio_url=audio_url,
                    character_id=char_id,
                    song_id=song_id
                )

                local_file_path = None
                if download_result.get("status") == "success":
                    local_file_path = download_result.get("local_path")
                    filename = Path(local_file_path).name
                    # 使用完整的後端 URL，讓前端可以直接播放
                    full_url = f"http://localhost:8000/songs/{filename}"

                    # 更新資料庫：使用完整 URL
                    cursor.execute("""
                        UPDATE character_songs
                        SET status = 'completed', song_url = ?, local_path = ?
                        WHERE id = ?
                    """, (full_url, local_file_path, song_id))
                else:
                    # 下載失敗，但仍使用 URL
                    cursor.execute("""
                        UPDATE character_songs
                        SET status = 'completed', song_url = ?
                        WHERE id = ?
                    """, (audio_url, song_id))
                conn.commit()

                # 使用完整 URL 作為返回的 audio_url
                if local_file_path:
                    audio_url = f"http://localhost:8000/songs/{Path(local_file_path).name}"

            # 也更新歌詞提示
            lyrics_hint = result.get("lyrics_hint", "")
            voice_style = result.get("voice_style", "")
            generated_lyrics = result.get("lyrics", "")

            # 更新歌詞和提示
            cursor.execute("""
                UPDATE character_songs
                SET lyrics = ?, prompt = ?, genre = ?, mood = ?, tempo = ?
                WHERE id = ?
            """, (generated_lyrics, lyrics_hint, "", "", "", song_id))
            conn.commit()
            conn.close()

            return {
                "song_id": song_id,
                "character_id": char_id,
                "character_number": char.get("character_number"),
                "character_name": char["name"],
                "title": title,
                "song_type": song_type,
                "status": "completed" if audio_url else "generating",
                "lyrics": generated_lyrics,
                "lyrics_hint": lyrics_hint,
                "voice_style": voice_style,
                "audio_url": audio_url,
                "message": "歌曲生成完成" if audio_url else "歌曲生成中,請稍後刷新"
            }
        else:
            return {
                "song_id": song_id,
                "character_id": char_id,
                "character_number": char.get("character_number"),
                "character_name": char["name"],
                "title": title,
                "song_type": song_type,
                "status": "failed",
                "error": result.get("error", "Generation failed"),
                "message": "歌曲生成失敗"
            }
    except Exception as e:
        return {
            "song_id": song_id,
            "character_id": char_id,
            "character_number": char.get("character_number"),
            "character_name": char["name"],
            "title": title,
            "song_type": song_type,
            "status": "failed",
            "error": str(e),
            "message": "歌曲生成失敗"
        }


# === MV Concept Routes ===

from services.mv_service import MVSceneGenerator, generate_mv_for_song
from services.portfolio_prompt_service import PortfolioPromptGenerator


@router.post("/songs/{song_id}/mv-concept")
def generate_mv_concept(song_id: int, request: dict = Body(None)):
    """
    為歌曲生成 MV 腳本概念
    
    將歌詞拆解為 10-20 個場景，生成 SeedDance 格式的 prompt
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 取得歌曲
    song_row = cursor.execute("SELECT * FROM character_songs WHERE id = ?", (song_id,)).fetchone()
    if not song_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Song not found")

    song = dict(song_row)
    lyrics = song.get("lyrics", "") or ""
    song_title = song.get("title", "Untitled")

    # 取得角色列表（用於帶入 MV）
    characters = []
    selected_char_ids = request.get("character_ids", []) if request else []

    if selected_char_ids:
        for char_id in selected_char_ids:
            char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
            if char_row:
                characters.append(dict(char_row))
    else:
        # 如果沒有指定角色，使用歌曲所屬角色
        char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (song["character_id"],)).fetchone()
        if char_row:
            characters.append(dict(char_row))

    # 取得其他可選角色
    all_chars = cursor.execute("SELECT * FROM characters").fetchall()
    all_characters = [dict(c) for c in all_chars]

    visual_style = request.get("visual_style", "Cinematic real footage") if request else "Cinematic real footage"
    aspect_ratio = request.get("aspect_ratio", "16:9") if request else "16:9"

    conn.close()

    # 生成 MV 概念
    generator = MVSceneGenerator()
    mv_concept = generator.generate_mv_concept(
        song_title=song_title,
        lyrics=lyrics,
        characters=characters,
        visual_style=visual_style,
        aspect_ratio=aspect_ratio
    )

    # 儲存到資料庫
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO mv_concepts (song_id, title, global_style, visual_palette, aspect_ratio, duration_estimate, character_configs, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        song_id,
        mv_concept.get("title", ""),
        mv_concept.get("global_style", ""),
        mv_concept.get("visual_palette", ""),
        mv_concept.get("aspect_ratio", "16:9"),
        mv_concept.get("duration_estimate", ""),
        json.dumps(mv_concept.get("character_configs", [])),
        "generated"
    ))
    conn.commit()
    mv_concept_id = cursor.lastrowid

    # 儲存每個場景
    for scene in mv_concept.get("scenes", []):
        cursor.execute("""
            INSERT INTO mv_scenes (mv_concept_id, scene_number, lyric_segment, visual_prompt, camera_movement, mood, subject, background, atmosphere, character_ids, duration_hint, seeddance_prompt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            mv_concept_id,
            scene.get("scene_number"),
            scene.get("lyric_segment", ""),
            scene.get("visual_prompt", ""),
            scene.get("camera_movement", ""),
            scene.get("mood", ""),
            scene.get("subject", ""),
            scene.get("background", ""),
            scene.get("atmosphere", ""),
            scene.get("character_ids", "[]"),
            scene.get("duration_hint", ""),
            scene.get("seeddance_prompt", "")
        ))
    conn.commit()
    conn.close()

    mv_concept["id"] = mv_concept_id
    mv_concept["song_id"] = song_id
    mv_concept["available_characters"] = all_characters

    return mv_concept


@router.get("/songs/{song_id}/mv-concept")
def get_mv_concept(song_id: int):
    """
    取得歌曲的 MV 腳本
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 取得 MV 概念
    mv_row = cursor.execute(
        "SELECT * FROM mv_concepts WHERE song_id = ? ORDER BY id DESC LIMIT 1",
        (song_id,)
    ).fetchone()

    if not mv_row:
        conn.close()
        return {"exists": False, "message": "尚未生成 MV 腳本"}

    mv_concept = dict(mv_row)
    mv_concept_id = mv_concept["id"]

    # 解析 character_configs
    if mv_concept.get("character_configs"):
        try:
            mv_concept["character_configs"] = json.loads(mv_concept["character_configs"])
        except:
            pass

    # 取得所有場景
    scenes = cursor.execute(
        "SELECT * FROM mv_scenes WHERE mv_concept_id = ? ORDER BY scene_number",
        (mv_concept_id,)
    ).fetchall()

    scenes_list = []
    for scene in scenes:
        s = dict(scene)
        # 解析 character_ids
        if s.get("character_ids"):
            try:
                s["character_ids"] = json.loads(s["character_ids"])
            except:
                s["character_ids"] = []
        scenes_list.append(s)

    mv_concept["scenes"] = scenes_list

    # 取得可用角色
    all_chars = cursor.execute("SELECT * FROM characters").fetchall()
    mv_concept["available_characters"] = [dict(c) for c in all_chars]

    conn.close()

    return mv_concept


@router.get("/mv-concepts/{concept_id}")
def get_mv_concept_by_id(concept_id: int):
    """根據 ID 取得 MV 腳本"""
    conn = get_connection()
    cursor = conn.cursor()

    mv_row = cursor.execute("SELECT * FROM mv_concepts WHERE id = ?", (concept_id,)).fetchone()
    if not mv_row:
        conn.close()
        raise HTTPException(status_code=404, detail="MV concept not found")

    mv_concept = dict(mv_row)

    # 解析 character_configs
    if mv_concept.get("character_configs"):
        try:
            mv_concept["character_configs"] = json.loads(mv_concept["character_configs"])
        except:
            pass

    # 取得所有場景
    scenes = cursor.execute(
        "SELECT * FROM mv_scenes WHERE mv_concept_id = ? ORDER BY scene_number",
        (concept_id,)
    ).fetchall()

    scenes_list = []
    for scene in scenes:
        s = dict(scene)
        if s.get("character_ids"):
            try:
                s["character_ids"] = json.loads(s["character_ids"])
            except:
                s["character_ids"] = []
        scenes_list.append(s)

    mv_concept["scenes"] = scenes_list

    # 取得歌曲資訊
    song_row = cursor.execute("SELECT * FROM character_songs WHERE id = ?", (mv_concept["song_id"],)).fetchone()
    if song_row:
        mv_concept["song"] = dict(song_row)

    conn.close()

    return mv_concept


@router.get("/mv-concepts/{concept_id}/export")
def export_mv_concept(concept_id: int, format: str = "json"):
    """
    匯出 MV 腳本
    format: json 或 markdown
    """
    mv_concept = get_mv_concept_by_id(concept_id)

    generator = MVSceneGenerator()

    if format == "markdown":
        content = generator.export_as_readable(mv_concept)
        return {"format": "markdown", "content": content}
    else:
        content = generator.export_as_json(mv_concept)
        return {"format": "json", "content": content}


@router.get("/songs/{song_id}")
def get_song(song_id: int):
    """取得歌曲詳情"""
    conn = get_connection()
    cursor = conn.cursor()

    song_row = cursor.execute("SELECT * FROM character_songs WHERE id = ?", (song_id,)).fetchone()
    if not song_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Song not found")

    song = dict(song_row)

    # 取得角色資訊
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (song["character_id"],)).fetchone()
    if char_row:
        char = dict(char_row)
        song["character_number"] = char.get("character_number")
        song["character_name"] = char["name"]

    conn.close()
    return song


@router.delete("/songs/{song_id}")
def delete_song(song_id: int):
    """刪除歌曲"""
    conn = get_connection()
    cursor = conn.cursor()

    song_row = cursor.execute("SELECT * FROM character_songs WHERE id = ?", (song_id,)).fetchone()
    if not song_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Song not found")

    song = dict(song_row)

    # 刪除歌曲檔案
    if song.get("song_path"):
        try:
            Path(song["song_path"]).unlink(missing_ok=True)
        except:
            pass

    # 刪除資料庫記錄
    cursor.execute("DELETE FROM character_songs WHERE id = ?", (song_id,))
    conn.commit()
    conn.close()

    return {"message": "歌曲已刪除", "song_id": song_id}


@router.get("/music/genres")
def get_music_genres():
    """取得可用的音樂類型"""
    return [
        {"value": "pop", "label": "流行 Pop"},
        {"value": "ballad", "label": "抒情 Ballad"},
        {"value": "rock", "label": "搖滾 Rock"},
        {"value": "electronic", "label": "電子 Electronic"},
        {"value": "jazz", "label": "爵士 Jazz"},
        {"value": "classical", "label": "古典 Classical"},
        {"value": "rnb", "label": "節奏藍調 R&B"},
        {"value": "folk", "label": "民謠 Folk"},
        {"value": "hiphop", "label": "嘻哈 Hip-Hop"},
        {"value": "anime", "label": "動漫風 Anime"},
    ]


@router.get("/music/moods")
def get_music_moods():
    """取得可用的音樂情緒"""
    return [
        {"value": "warm", "label": "溫暖 Warm"},
        {"value": "energetic", "label": "活力 Energetic"},
        {"value": "melancholic", "label": "憂鬱 Melancholic"},
        {"value": "dreamy", "label": "夢幻 Dreamy"},
        {"value": "elegant", "label": "優雅 Elegant"},
        {"value": "playful", "label": "俏皮 Playful"},
        {"value": "romantic", "label": "浪漫 Romantic"},
        {"value": "epic", "label": "史詩 Epic"},
        {"value": "serene", "label": "寧靜 Serene"},
        {"value": "intense", "label": "激烈 Intense"},
    ]


@router.get("/music/tempos")
def get_music_tempos():
    """取得可用的音樂節奏"""
    return [
        {"value": "slow", "label": "慢 Slow"},
        {"value": "medium", "label": "中速 Medium"},
        {"value": "fast", "label": "快速 Fast"},
    ]


# === Diary Routes ===

@router.get("/characters/{char_id}/diaries")
def get_character_diaries(char_id: int, limit: int = 20, offset: int = 0):
    """取得角色的所有日記"""
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在且為女性
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)
    if char.get("gender") != "female":
        conn.close()
        raise HTTPException(status_code=403, detail="只有女性角色可以寫日記")

    diaries = cursor.execute("""
        SELECT d.*, c.name as character_name, c.character_number,
               rc.name as related_character_name
        FROM character_diaries d
        LEFT JOIN characters c ON d.character_id = c.id
        LEFT JOIN characters rc ON d.related_character_id = rc.id
        WHERE d.character_id = ?
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
    """, (char_id, limit, offset)).fetchall()

    total = cursor.execute(
        "SELECT COUNT(*) FROM character_diaries WHERE character_id = ?", (char_id,)
    ).fetchone()[0]

    conn.close()

    result = []
    for diary in diaries:
        d = dict(diary)
        # 解析 tags JSON
        if d.get("tags"):
            try:
                d["tags"] = json.loads(d["tags"])
            except:
                d["tags"] = []
        result.append(d)

    return {
        "diaries": result,
        "total": total,
        "limit": limit,
        "offset": offset,
        "character": {
            "id": char["id"],
            "character_number": char.get("character_number"),
            "name": char["name"],
            "gender": char.get("gender")
        }
    }


@router.post("/characters/{char_id}/diaries")
def create_diary(char_id: int, req: dict):
    """創建日記 (僅限女性角色) """
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在且為女性
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)
    if char.get("gender") != "female":
        conn.close()
        raise HTTPException(status_code=403, detail="只有女性角色可以寫日記")

    # 取得參數
    title = req.get("title", "")
    content = req.get("content", "")
    mood = req.get("mood", "")
    weather = req.get("weather", "")
    location = req.get("location", "")
    tags = req.get("tags", [])
    related_character_id = req.get("related_character_id")
    is_published = req.get("is_published", 0)

    if not title or not content:
        conn.close()
        raise HTTPException(status_code=400, detail="標題和內容不能為空")

    tags_json = json.dumps(tags) if isinstance(tags, list) else tags

    cursor.execute(
        """INSERT INTO character_diaries
           (character_id, title, content, mood, weather, location, tags, related_character_id, is_published)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (char_id, title, content, mood, weather, location, tags_json, related_character_id, is_published)
    )
    conn.commit()
    diary_id = cursor.lastrowid
    conn.close()

    return {
        "id": diary_id,
        "character_id": char_id,
        "character_number": char.get("character_number"),
        "character_name": char["name"],
        "title": title,
        "mood": mood,
        "weather": weather,
        "location": location,
        "tags": tags,
        "related_character_id": related_character_id,
        "is_published": is_published,
        "message": "日記已創建"
    }


@router.get("/diaries/{diary_id}")
def get_diary(diary_id: int):
    """取得日記詳情"""
    conn = get_connection()
    cursor = conn.cursor()

    diary_row = cursor.execute("""
        SELECT d.*, c.name as character_name, c.character_number,
               rc.name as related_character_name
        FROM character_diaries d
        LEFT JOIN characters c ON d.character_id = c.id
        LEFT JOIN characters rc ON d.related_character_id = rc.id
        WHERE d.id = ?
    """, (diary_id,)).fetchone()

    if not diary_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Diary not found")

    diary = dict(diary_row)
    if diary.get("tags"):
        try:
            diary["tags"] = json.loads(diary["tags"])
        except:
            diary["tags"] = []

    conn.close()
    return diary


@router.put("/diaries/{diary_id}")
def update_diary(diary_id: int, req: dict):
    """更新日記"""
    conn = get_connection()
    cursor = conn.cursor()

    # 確認日記存在
    diary_row = cursor.execute("SELECT * FROM character_diaries WHERE id = ?", (diary_id,)).fetchone()
    if not diary_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Diary not found")

    # 取得目前值
    current = dict(diary_row)

    # 更新欄位
    title = req.get("title", current["title"])
    content = req.get("content", current["content"])
    mood = req.get("mood", current["mood"])
    weather = req.get("weather", current["weather"])
    location = req.get("location", current["location"])
    tags = req.get("tags", current["tags"])
    related_character_id = req.get("related_character_id", current["related_character_id"])
    is_published = req.get("is_published", current["is_published"])

    if isinstance(tags, list):
        tags = json.dumps(tags)

    cursor.execute("""
        UPDATE character_diaries
        SET title = ?, content = ?, mood = ?, weather = ?, location = ?,
            tags = ?, related_character_id = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (title, content, mood, weather, location, tags, related_character_id, is_published, diary_id))
    conn.commit()
    conn.close()

    return {"id": diary_id, "message": "日記已更新"}


@router.delete("/diaries/{diary_id}")
def delete_diary(diary_id: int):
    """刪除日記"""
    conn = get_connection()
    cursor = conn.cursor()

    diary_row = cursor.execute("SELECT * FROM character_diaries WHERE id = ?", (diary_id,)).fetchone()
    if not diary_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Diary not found")

    cursor.execute("DELETE FROM character_diaries WHERE id = ?", (diary_id,))
    conn.commit()
    conn.close()

    return {"message": "日記已刪除", "diary_id": diary_id}


@router.get("/diary/moods")
def get_diary_moods():
    """取得可用的日記心情"""
    return [
        {"value": "happy", "label": "開心", "icon": "😊"},
        {"value": "sad", "label": "難過", "icon": "😢"},
        {"value": "angry", "label": "生氣", "icon": "😠"},
        {"value": "shy", "label": "害羞", "icon": "😳"},
        {"value": "excited", "label": "期待", "icon": "🤩"},
        {"value": "lonely", "label": "失落", "icon": "😔"},
        {"value": "touched", "label": "感動", "icon": "🥹"},
        {"value": "calm", "label": "平靜", "icon": "😌"},
        {"value": "confused", "label": "困惑", "icon": "😵"},
        {"value": "grateful", "label": "感激", "icon": "🙏"},
    ]


@router.get("/diary/weathers")
def get_diary_weathers():
    """取得可用的天氣"""
    return [
        {"value": "sunny", "label": "晴天", "icon": "☀️"},
        {"value": "rainy", "label": "雨天", "icon": "🌧️"},
        {"value": "cloudy", "label": "陰天", "icon": "☁️"},
        {"value": "snowy", "label": "雪天", "icon": "❄️"},
        {"value": "windy", "label": "颳風", "icon": "💨"},
        {"value": "stormy", "label": "暴風雨", "icon": "⛈️"},
    ]


@router.get("/diary/locations")
def get_diary_locations():
    """取得可用的地點"""
    return [
        {"value": "school", "label": "學校"},
        {"value": "home", "label": "家裡"},
        {"value": "park", "label": "公園"},
        {"value": "cafe", "label": "咖啡廳"},
        {"value": "beach", "label": "海邊"},
        {"value": "mall", "label": "商場"},
        {"value": "library", "label": "圖書館"},
        {"value": "restaurant", "label": "餐廳"},
        {"value": "cinema", "label": "電影院"},
        {"value": "street", "label": "街道"},
    ]


@router.get("/diary/tags")
def get_diary_tags():
    """取得可用的日記標籤"""
    return [
        {"value": "love", "label": "戀愛"},
        {"value": "friendship", "label": "友情"},
        {"value": "daily", "label": "日常"},
        {"value": "secret", "label": "秘密"},
        {"value": "study", "label": "學業"},
        {"value": "family", "label": "家庭"},
        {"value": "dream", "label": "夢想"},
        {"value": "memory", "label": "回憶"},
        {"value": "growth", "label": "成長"},
        {"value": "conflict", "label": "衝突"},
    ]


@router.post("/diary/generate")
def generate_diary(req: dict):
    """根據故事狀態動態生成完整日記內容"""
    char_id = req.get("character_id")
    direction = req.get("direction", "daily")

    if not char_id:
        raise HTTPException(status_code=400, detail="需要 character_id")

    conn = get_connection()
    cursor = conn.cursor()

    # 取得角色資料
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)

    # 取得所有女性角色的近期日記 (用於故事狀態分析) 
    recent_diaries_raw = cursor.execute("""
        SELECT d.*, c.name as char_name, c.character_number
        FROM character_diaries d
        JOIN characters c ON d.character_id = c.id
        WHERE c.gender = 'female'
        ORDER BY d.created_at DESC LIMIT 20
    """).fetchall()
    # 轉換為 dict list
    recent_diaries = [dict(row) for row in recent_diaries_raw] if recent_diaries_raw else []

    # 取得所有角色資料 (用於關係網絡) 
    all_chars_raw = cursor.execute("""
        SELECT id, name, character_number, gender, job, core_features
        FROM characters
    """).fetchall()
    # 轉換為 dict list
    all_chars = [dict(row) for row in all_chars_raw] if all_chars_raw else []

    # 分析故事狀態
    story_state = analyze_story_state(char, recent_diaries, all_chars, direction)

    # 使用 MiniMax API 生成日記
    diary_content = None
    try:
        from services.ai_service import AIService
        ai_service = AIService()
        result = ai_service.generate_diary_with_story_context(char, story_state, direction)
        if result:
            diary_content = result
    except Exception as e:
        print(f"AI service error: {e}")

    # 如果 MiniMax API 失敗或未設定,使用本地生成
    if not diary_content:
        diary_content = generate_diary_content_locally(char, story_state, direction)

    conn.close()

    return {
        "title": diary_content["title"],
        "content": diary_content["content"],
        "mood": diary_content["mood"],
        "mood_value": diary_content["mood_value"],
        "weather": diary_content["weather"],
        "location": diary_content["location"],
        "tags": diary_content["tags"],
        "story_context": story_state,  # 回傳故事狀態供前端參考
    }


def analyze_story_state(char: dict, recent_diaries: list, all_chars: list, direction: str) -> dict:
    """分析當前故事狀態"""

    char_id = char.get("id")
    char_name = char.get("name", "")

    # 取得該角色所有日記
    char_diaries = [d for d in recent_diaries if d.get("character_id") == char_id]

    # 角色關係圖 (根據故事聖經) 
    relationships = {
        "沈予曦": {"暗戀": "季允辰", "摯友": "簡怡然", "關注": "溫芯蕾"},
        "簡怡然": {"暗戀": "周敘明", "摯友": "沈予曦"},
        "姜以甯": {"暗戀": "季允辰", "前輩": "陸思珩"},
        "陸思珩": {"欣賞": "季允辰", "下屬": "姜以甯"},
        "溫芯蕾": {"暗戀": "沈予曦", "顧客": "季允辰"},
    }

    # 分析角色情緒趨勢
    mood_history = []
    for d in char_diaries[:5]:
        tags = json.loads(d.get("tags", "[]")) if d.get("tags") else []
        mood_history.append({
            "mood": d.get("mood", ""),
            "mood_value": d.get("mood_value", ""),
            "tags": tags,
            "date": d.get("created_at", ""),
        })

    # 分析近期事件 (從其他角色的日記中找尋交集) 
    related_events = []
    for d in recent_diaries:
        if d.get("character_id") != char_id:
            tags = json.loads(d.get("tags", "[]")) if d.get("tags") else []
            # 找出可能相關的事件
            if any(t in ["love", "friendship", "work", "secret"] for t in tags):
                related_events.append({
                    "who": d.get("char_name", ""),
                    "what": d.get("title", ""),
                    "mood": d.get("mood", ""),
                    "date": d.get("created_at", ""),
                })

    # 根據方向調整故事狀態
    direction_hints = {
        "love": {
            "focus": "感情線",
            "possible_topics": ["觀察暗戀對象", "意外互動", "內心掙扎", "嫉妒", "心動瞬間"]
        },
        "work": {
            "focus": "事業線",
            "possible_topics": ["工作成就", "職業瓶頸", "同事互動", "自我懷疑", "突破"]
        },
        "friendship": {
            "focus": "友情線",
            "possible_topics": ["閨蜜時光", "互相傾訴", "支持與陪伴", "誤會與和解"]
        },
        "daily": {
            "focus": "日常線",
            "possible_topics": ["小確幸", "生活感悟", "獨處時光", "興趣愛好"]
        }
    }

    state = direction_hints.get(direction, direction_hints["daily"])

    return {
        "character": char,
        "character_name": char_name,
        "character_job": char.get("job", ""),
        "relationships": relationships.get(char_name, {}),
        "mood_history": mood_history,
        "recent_events": related_events[:5],  # 最多5個相關事件
        "diary_count": len(char_diaries),
        "story_progress": "early" if len(char_diaries) < 3 else "middle" if len(char_diaries) < 8 else "late",
        "direction_hint": state,
        "all_characters": [dict(c) for c in all_chars],
    }


def generate_diary_content_locally(char: dict, story_state: dict, direction: str) -> dict:
    """本地日記生成 (當 MiniMax API 不可用時) """

    char_name = char.get("name", "")
    job = char.get("job", "")
    relationships = story_state.get("relationships", {})
    mood_history = story_state.get("mood_history", [])
    recent_events = story_state.get("recent_events", [])
    diary_count = story_state.get("diary_count", 0)

    import random

    if direction == "love":
        crush_target = relationships.get("暗戀", "季允辰")
        recent_moods = [m["mood"] for m in mood_history if m.get("mood")]

        if story_state.get("story_progress") == "early":
            title = "遇見了" + crush_target
            content = (
                "今天在公司再次看見了" + crush_target + ".\n\n"
                "他是雜誌社新來的攝影師,聽說是業界很有名氣的人.今天他穿著白色襯衫,拿著相機在會議室裡討論拍攝企劃.\n\n"
                "我不敢直視他,只能假裝在整理文件,用眼角的餘光偷偷觀察.他說話的時候聲音很好聽,笑起來有兩個小酒窩.\n\n"
                "心跳加速的感覺,我已經很久沒有體會過了.\n\n"
                "明明知道自己還不夠好,但就是忍不住會在意他的一切.\n\n"
                "這種暗戀的心情,到底是甜蜜還是苦澀呢?"
            )
            mood, mood_value = "心動", "lovely"
            tags = ["love", "secret"]
            weather = random.choice(["晴天", "陰天", "雨天"])
            location = "公司"

        elif any("心動" in str(e) or "喜歡" in str(e) for e in recent_events if e):
            title = "他的小細節"
            content = (
                "今天讓我更加確定,我對" + crush_target + "的心意.\n\n"
                "中午在茶水間,他剛好也在.他看見我的杯子沒水了,主動幫我加了水.\n\n"
                "就這樣一個小小的舉動,我卻開心了整整一個下午.\n\n"
                "身旁的同事好像察覺到了什麼,但我不敢承認.暗戀一個人,原來是這樣的心情.\n\n"
                "有點甜蜜,有點苦澀,更多的是期待.\n\n"
                "如果有一天,他也能注意到我就好了."
            )
            mood, mood_value = "期待", "excited"
            tags = ["love", "secret"]
            weather = random.choice(["晴天", "陰天"])
            location = "公司"

        else:
            title = "只是看著他就夠了"
            content = (
                "今天沒有機會跟" + crush_target + "說到話.\n\n"
                "但光是看著他出現在辦公室,心裡就覺得很踏實.\n\n"
                "他跟別人討論工作的樣子很帥,拿著相機專注的神情讓人移不開目光.\n\n"
                "我知道自己不應該這樣,但就是忍不住.\n\n"
                "也許暗戀一個人,並不需要結果.光是喜歡這件事本身,就已經足夠了."
            )
            mood, mood_value = "平靜", "calm"
            tags = ["love", "secret"]
            weather = random.choice(["晴天", "陰天"])
            location = "公司"

    elif direction == "work":
        title = "關於工作的一些事"
        content = (
            "今天在期刊編輯部開了一整天的會.\n\n"
            + job + "的工作真的很忙碌,每天都有新的文章要審核,新的標題要構思.\n\n"
            "還好有怡然在,她總是在我忙不過來的時候幫我分擔一些.有時候覺得,有這樣的朋友真的很幸運.\n\n"
            "雖然壓力很大,但看到雜誌順利出刊的那一刻,一切都值得了.\n\n"
            "職場的路還很長,我會繼續加油的."
        )
        mood, mood_value = random.choice([("疲憊", "tired"), ("滿足", "happy"), ("焦慮", "anxious")])
        tags = ["daily", "work"]
        weather = random.choice(["晴天", "陰天"])
        location = random.choice(["公司", "咖啡廳"])

    elif direction == "friendship":
        bestie = relationships.get("摯友", "簡怡然")
        title = "和摯友的一天"
        content = (
            "今天難得跟" + bestie + "出來吃飯聊天.\n\n"
            "我們約在母校附近的咖啡廳,那是我們以前常常一起來的地方.\n\n"
            "聊了很多關於最近的生活,工作,還有一些不敢跟別人說的心事.\n\n"
            "她說她最近也在為一些事情煩惱,但我看她笑得那麼開心,應該還好.\n\n"
            "友情最珍貴的地方,就是不需要解釋太多,對方就能懂.\n\n"
            "謝謝你一直在身邊."
        )
        mood, mood_value = "溫暖", "touched"
        tags = ["friendship"]
        weather = random.choice(["晴天", "陰天"])
        location = random.choice(["咖啡廳", "百貨公司"])

    else:
        title = char_name + "的小確幸"
        content = (
            "今天是很普通的一天.\n\n"
            "早上睡到自然醒,然後去家裡附近的咖啡廳喝了杯拿鐵.\n\n"
            "下午在家看書,晚上自己煮了一頓簡單的晚餐.\n\n"
            "這樣平凡的日子,其實也很珍貴.\n\n"
            "不需要應付誰,不需要趕時間,就這樣慢悠悠地過一天.\n\n"
            "生活中的小幸福,大概就是這樣累積起來的吧."
        )
        mood, mood_value = "平靜", "calm"
        tags = ["daily"]
        weather = random.choice(["晴天", "陰天", "雨天"])
        location = random.choice(["家裡", "咖啡廳", "公園"])

    return {
        "title": title,
        "content": content,
        "mood": mood,
        "mood_value": mood_value,
        "weather": weather,
        "location": location,
        "tags": tags,
    }


def generate_diary_content(char: dict, direction: str) -> dict:
    """根據角色和方向生成日記內容"""

    # 角色特徵
    char_name = char.get("name", "")
    char_id = char.get("id")

    # 方向定義
    directions = {
        # 暗戀心事
        "love": {
            "title_templates": [
                f"關於{char_name}的心動瞬間",
                f"今天又想起了某個人",
                f"偷偷喜歡的心情",
            ],
            "moods": ["心動", "期待", "害羞"],
            "mood_values": ["lovely", "excited", "shy"],
            "weathers": ["晴天", "陰天", "雨天"],
            "locations": ["公司", "咖啡廳", "回家的路上"],
            "tags": ["love", "secret"],
            "content_templates": [
                f"""今天又在公司看見他了.

他今天穿著{['白色襯衫', '深藍色西裝', '簡單的T恤'][hash(char_name) % 3]},拿著相機的樣子特別帥氣.我假裝在整理文件,偷偷用眼角餘光觀察他.

他對著編輯部的同事說話時,笑起來有兩個小酒窩.我的心跳漏了一拍.

這種暗戀的心情真的很奇妙,明明知道不可能,卻還是忍不住在意他的一切.

,或午在我們擦肩而過的時候,他輕輕點了個頭,我也趕快回應了.不知道他會不會覺得我很奇怪呢? 

明天如果有機會,我想找個話題跟他聊聊天,哪怕只是一句話也好.""",

                f"""今天下班後,一個人走在回家的路上,天空飄著細雨.

我想起了上次他說的話,他說他喜歡雨天的氣氛,說雨聲可以讓人冷靜下來.

雖然現在跟他還不熟,但每次想到他說話時的表情,心裡就會覺得很溫暖.

這種偷偷喜歡的心情,大概每個人都有過吧.雖然不知道會不會有結果,但至少現在這份心動是真的.

或午這就是暗戀的美好之處 -- 充滿了想像和期待.""",
            ]
        },
        # 工作日常
        "work": {
            "title_templates": [
                f"{char_name}的工作日誌",
                "今天截稿了",
                "關於工作的一些想法",
            ],
            "moods": ["焦慮", "疲憊", "滿足"],
            "mood_values": ["anxious", "tired", "happy"],
            "weathers": ["晴天", "陰天", "雨天"],
            "locations": ["公司", "咖啡廳", "書店"],
            "tags": ["daily", "work"],
            "content_templates": [
                f"""今天又加班到很晚,截稿前的最後衝刺總是特別累人.

編輯部的會議一個接著一個,感覺時間都不夠用.還好最後順利完成了,松了一口气.

一個人坐在空蕩蕩的辦公室裡,看著窗外的夜景,突然覺得這種忙碌也很充實.

或午人生就是這樣吧,為了夢想努力的日子雖然辛苦,但也很值得.

希望明天可以有點進展,不要一直卡在同一個地方.""",

                f"""今天的工作遇到了瓶頸,怎麼寫都不對.

主編說我的文章缺少溫度,要再加油.但有時候真的很難拿捏那個分寸.

一個人去咖啡廳坐了一會兒,喝了杯拿鐵,看看路人來來往往.

每個人都有自己要忙的事情,我也要加油才行.

或午休息一下再回來,會有不同的想法吧.""",
            ]
        },
        # 友情互動
        "friendship": {
            "title_templates": [
                f"和閨蜜的一天",
                "好朋友在一起",
                "聊聊心事",
            ],
            "moods": ["開心", "溫暖", "感慨"],
            "mood_values": ["happy", "touched", "grateful"],
            "weathers": ["晴天", "陰天"],
            "locations": ["咖啡廳", "百貨公司", "公園"],
            "tags": ["friendship"],
            "content_templates": [
                f"""今天跟好朋友出去逛街,聊了很多心事.

我們在咖啡廳坐了整個下午,說了很多關於工作, 愛情, 未來的事.

有時候覺得,能有一個懂你的朋友真的很幸運.

她說她最近也在為一些事情煩惱,我們互相分享了彼此的想法.

這種不需要偽裝的相處方式,讓我覺得很輕鬆.

謝謝她一直在我身邊.""",

                f"""今天好朋友約我吃飯,說有重要的事情要跟我說.

我們聊了很久,她說她最近工作壓力很大,有點想放棄.

我跟她分享了我的一些經驗,希望可以幫到她.

離開的時候,她笑著說 "還好有你在" .

或午友情就是這樣吧,互相扶持, 一起成長.

希望她一切順利.""",
            ]
        },
        # 日常隨想
        "daily": {
            "title_templates": [
                f"{char_name}的一天",
                "普通的日子",
                "小確幸",
            ],
            "moods": ["平靜", "滿足", "愜意"],
            "mood_values": ["calm", "happy", "grateful"],
            "weathers": ["晴天", "陰天", "雨天"],
            "locations": ["家裡", "咖啡廳", "公園"],
            "tags": ["daily"],
            "content_templates": [
                f"""今天是很普通的一天,但也很充實.

早上起床後喝了杯咖啡,看了會兒書.午後去超市買了點東西.

一個人散步回家的路上,看到路邊的花開得很漂亮,忍不住拍了下來.

這種簡單的生活,其實也很幸福.

或午幸福就藏在這些小細節裡吧.""",

                f"""今天天氣很好,心情也很平靜.

一個人坐在咖啡廳的窗邊,看著外面的行人,什麼都不想.

這種放空的時間很難得,可以讓自己暫時忘記煩惱.

或午每個人都需要這樣的時刻吧,給自己一個喘息的空間.

明天又要開始忙碌了,但今天就先好好休息吧.""",
            ]
        },
    }

    # 根據方向取得內容模板
    direction_data = directions.get(direction, directions["daily"])

    # 隨機選擇模板
    import random
    idx = hash(char_name + direction) % len(direction_data["content_templates"])

    title_idx = hash(char_name + direction) % len(direction_data["title_templates"])
    mood_idx = hash(char_name + direction + "mood") % len(direction_data["moods"])
    weather_idx = hash(char_name + direction + "weather") % len(direction_data["weathers"])
    location_idx = hash(char_name + direction + "location") % len(direction_data["locations"])

    return {
        "title": direction_data["title_templates"][title_idx],
        "content": direction_data["content_templates"][idx],
        "mood": direction_data["moods"][mood_idx],
        "mood_value": direction_data["mood_values"][mood_idx],
        "weather": direction_data["weathers"][weather_idx],
        "location": direction_data["locations"][location_idx],
        "tags": direction_data["tags"],
    }


@router.get("/diary/suggest-continuation/{char_id}")
def suggest_diary_continuation(char_id: int):
    """根據角色目前的故事狀態,建議日記的發展方向"""
    conn = get_connection()
    cursor = conn.cursor()

    # 取得角色資料
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)

    # 取得角色最近的三篇日記
    recent_diaries = cursor.execute("""
        SELECT * FROM character_diaries
        WHERE character_id = ?
        ORDER BY created_at DESC LIMIT 3
    """, (char_id,)).fetchall()

    # 取得所有女性角色的日記總數 (用來了解故事進度) 
    diary_counts = cursor.execute("""
        SELECT c.id, c.name, c.character_number, COUNT(d.id) as diary_count
        FROM characters c
        LEFT JOIN character_diaries d ON c.id = d.character_id
        WHERE c.gender = 'female'
        GROUP BY c.id
    """).fetchall()

    # 根據角色特性與現有日記分析,產生建議
    suggestions = []
    char_name = char.get("name", "")

    # 根據角色暗戀關係給予不同建議
    if char_id == 1:  # 沈予曦 -> 暗戀季允辰
        suggestions = [
            {
                "direction": "observe_love",
                "title": "觀察暗戀對象",
                "desc": "今天在工作場合偷偷觀察季允辰,注意到了某個小細節...",
                "mood": "心動",
                "tags": ["love", "secret"],
                "mood_value": "lovely"
            },
            {
                "direction": "work_struggle",
                "title": "工作上的掙扎",
                "desc": "雜誌編輯的工作遇到瓶頸,文字怎麼寫都不對...",
                "mood": "焦慮",
                "tags": ["daily", "growth"],
                "mood_value": "anxious"
            },
            {
                "direction": "friend_confide",
                "title": "對閨蜜傾訴",
                "desc": "忍不住對怡然透露了一點點心情,卻又趕緊掩飾過去...",
                "mood": "矛盾",
                "tags": ["friendship", "secret"],
                "mood_value": "confused"
            },
            {
                "direction": "chance_encounter",
                "title": "意外相遇",
                "desc": "在咖啡廳偶遇,沒想到他記得我的名字...",
                "mood": "驚喜",
                "tags": ["love", "daily"],
                "mood_value": "lovely"
            }
        ]
    elif char_id == 3:  # 簡怡然
        suggestions = [
            {
                "direction": "fitness_progress",
                "title": "健身的突破",
                "desc": "今天終於做到了以前做不到的訓練動作,流汗的感覺真棒! ",
                "mood": "振奮",
                "tags": ["daily", "growth"],
                "mood_value": "energetic"
            },
            {
                "direction": "online_feedback",
                "title": "網友的回饋",
                "desc": "看到粉絲說因為我而開始運動,感到自己的努力有意義...",
                "mood": "感動",
                "tags": ["daily", "dream"],
                "mood_value": "grateful"
            },
            {
                "direction": "friend_concern",
                "title": "擔心朋友",
                "desc": "隱約感覺予曦最近有心事,想要關心她卻不知怎麼開口...",
                "mood": "擔憂",
                "tags": ["friendship", "secret"],
                "mood_value": "worried"
            }
        ]
    elif char_id == 4:  # 姜以甯 -> 暗戀季允辰
        suggestions = [
            {
                "direction": "training_hardship",
                "title": "練習生的辛苦",
                "desc": "又是一整天的訓練,累到不行但還是要笑著面對鏡頭...",
                "mood": "疲憊",
                "tags": ["daily", "dream"],
                "mood_value": "tired"
            },
            {
                "direction": "secret_admiration",
                "title": "秘密的心情",
                "desc": "偷偷關注了他的社群帳號,看到他分享的照片,心跳漏了一拍...",
                "mood": "心動",
                "tags": ["love", "secret"],
                "mood_value": "lovely"
            },
            {
                "direction": "jealousy",
                "title": "忌妒的心情",
                "desc": "看到他身邊出現其他女生,心裡酸酸的...",
                "mood": "難過",
                "tags": ["love", "conflict"],
                "mood_value": "sad"
            },
            {
                "direction": "supportive_friend",
                "title": "支持朋友",
                "desc": "陪芯蕾去咖啡廳,意外聽到了她的心事...",
                "mood": "複雜",
                "tags": ["friendship", "secret"],
                "mood_value": "confused"
            }
        ]
    elif char_id == 5:  # 陸思珩
        suggestions = [
            {
                "direction": "work_stress",
                "title": "公關工作的壓力",
                "desc": "處理了一個棘手的廠商問題,下班後只想一個人靜靜...",
                "mood": "疲憊",
                "tags": ["daily", "work"],
                "mood_value": "tired"
            },
            {
                "direction": "self_reflection",
                "title": "對自己的懷疑",
                "desc": "這樣的生活真的是我想要的嗎? 偶爾會這樣問自己...",
                "mood": "迷茫",
                "tags": ["dream", "growth"],
                "mood_value": "sad"
            },
            {
                "direction": "friend_gathering",
                "title": "朋友聚會",
                "desc": "難得和姐妹們聚會,聊聊近況,感覺被充滿了電...",
                "mood": "開心",
                "tags": ["friendship", "daily"],
                "mood_value": "happy"
            }
        ]
    elif char_id == 6:  # 溫芯蕾 -> 暗戀沈予曦
        suggestions = [
            {
                "direction": "customer_encounter",
                "title": "特別的客人",
                "desc": "今天有個客人是雜誌編輯,看到她在專注地寫稿...",
                "mood": "心動",
                "tags": ["love", "daily"],
                "mood_value": "lovely"
            },
            {
                "direction": "coffee_shop_day",
                "title": "咖啡廳的日常",
                "desc": "觀察來來往往的客人,每個人都有自己的故事...",
                "mood": "平靜",
                "tags": ["daily", "memory"],
                "mood_value": "peaceful"
            },
            {
                "direction": "secret_feeling",
                "title": "不能說的秘密",
                "desc": "對她的感覺越來越強烈,卻知道這份感情說不出口...",
                "mood": "心痛",
                "tags": ["love", "secret"],
                "mood_value": "sad"
            },
            {
                "direction": "new_regular",
                "title": "新常客",
                "desc": "那個攝影師又來了,這次他拍了咖啡廳的某個角落...",
                "mood": "好奇",
                "tags": ["daily", "curiosity"],
                "mood_value": "curious"
            }
        ]
    else:
        # 預設建議
        suggestions = [
            {
                "direction": "daily_mood",
                "title": "今日心情",
                "desc": "記錄下今天的所見所聞所想...",
                "mood": "平靜",
                "tags": ["daily"],
                "mood_value": "peaceful"
            },
            {
                "direction": "reflection",
                "title": "自我反思",
                "desc": "最近的生活讓我開始思考一些事情...",
                "mood": "思考",
                "tags": ["growth", "dream"],
                "mood_value": "curious"
            },
            {
                "direction": "interaction",
                "title": "與人的互動",
                "desc": "今天和某個人有了特別的交流...",
                "mood": "溫馨",
                "tags": ["friendship", "daily"],
                "mood_value": "happy"
            }
        ]

    # 根據日記數量調整建議的深度
    total_diaries = sum(row["diary_count"] for row in diary_counts)
    story_progress = "beginning" if total_diaries < 5 else "middle" if total_diaries < 15 else "climax"

    conn.close()

    return {
        "character": {
            "id": char["id"],
            "name": char["name"],
            "character_number": char.get("character_number")
        },
        "recent_diaries_count": len(recent_diaries),
        "story_progress": story_progress,
        "suggestions": suggestions
    }


# === Portfolio Routes ===

@router.get("/characters/{char_id}/portfolio")
def get_character_portfolio(
    char_id: int,
    scene_type: str = None,
    is_reference: int = None,
    limit: int = 50,
    offset: int = 0
):
    """取得角色的影集圖片"""
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    # 查詢影集圖片
    query = "SELECT * FROM character_portfolio WHERE character_id = ?"
    params = [char_id]

    if scene_type:
        query += " AND scene_type = ?"
        params.append(scene_type)

    if is_reference is not None:
        query += " AND is_reference = ?"
        params.append(is_reference)

    query += " ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    images = cursor.execute(query, params).fetchall()

    # 取得總數
    count_query = "SELECT COUNT(*) FROM character_portfolio WHERE character_id = ?"
    count_params = [char_id]
    if scene_type:
        count_query += " AND scene_type = ?"
        count_params.append(scene_type)
    if is_reference is not None:
        count_query += " AND is_reference = ?"
        count_params.append(is_reference)

    total = cursor.execute(count_query, count_params).fetchone()[0]

    conn.close()

    result = []
    for img in images:
        d = dict(img)
        if d.get("tags"):
            try:
                d["tags"] = json.loads(d["tags"])
            except:
                d["tags"] = []
        result.append(d)

    return {
        "images": result,
        "total": total,
        "character_id": char_id
    }


@router.post("/characters/{char_id}/portfolio")
def add_portfolio_image(char_id: int, req: dict):
    """手動新增影集圖片（從其他來源複製）"""
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    image_path = req.get("image_path")
    if not image_path:
        raise HTTPException(status_code=400, detail="image_path is required")

    # 檢查是否已達上限 (50)
    current_count = cursor.execute(
        "SELECT COUNT(*) FROM character_portfolio WHERE character_id = ?",
        (char_id,)
    ).fetchone()[0]

    if current_count >= 50:
        conn.close()
        raise HTTPException(status_code=400, detail="已達影集上限 (50張)")

    scene_type = req.get("scene_type", "solo")
    scene_description = req.get("scene_description", "")
    tags = req.get("tags", [])
    is_reference = req.get("is_reference", 0)

    if isinstance(tags, list):
        tags = json.dumps(tags)

    cursor.execute("""
        INSERT INTO character_portfolio
        (character_id, image_path, scene_type, scene_description, tags, is_reference)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (char_id, image_path, scene_type, scene_description, tags, is_reference))

    portfolio_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": portfolio_id,
        "message": "影集圖片已新增",
        "image_path": image_path
    }


@router.post("/characters/{char_id}/portfolio/generate")
def generate_portfolio(char_id: int, req: dict = {}):
    """
    根據角色特色 + 日記內容生成影集圖片
    
    新功能：
    - 使用 PortfolioPromptGenerator 根據角色設定 + 日記生成 SeedDance 提示詞
    - 提示詞自動拆分為 Subject / Setting / Atmosphere / Camera / Technical
    - 自動萃取地點、情緒、動作標籤
    - 所有資訊存入資料庫供後續搜尋和影片片段調用
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)

    # 檢查是否已達上限 (50)
    current_count = cursor.execute(
        "SELECT COUNT(*) FROM character_portfolio WHERE character_id = ?",
        (char_id,)
    ).fetchone()[0]

    if current_count >= 50:
        conn.close()
        raise HTTPException(status_code=400, detail="已達影集上限 (50張)")

    # 取得生成參數
    scene_type = req.get("scene_type", "solo")  # solo, outfit, expression, angle, action
    scene_count = min(req.get("count", 3), 10)  # 最多一次生成10張
    scene_description = req.get("scene_description", "")  # 可選的場景描述
    reference_paths = req.get("reference_paths", [])  # 可選的參考圖路徑

    # 取得角色最近的日記（用於生成 SeedDance prompt）
    diary_rows = cursor.execute("""
        SELECT * FROM character_diaries
        WHERE character_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    """, (char_id,)).fetchall()
    diaries = [dict(row) for row in diary_rows]

    conn.close()

    # 使用 PortfolioPromptGenerator 生成 SeedDance 提示詞
    prompt_generator = PortfolioPromptGenerator()
    
    # 根據場景數量生成對應數量的 prompt
    prompt_results = []
    for i in range(scene_count):
        result = prompt_generator.generate_portfolio_prompt(
            character=char,
            diaries=diaries,
            scene_type=scene_type,
            scene_description=scene_description if scene_description else ""
        )
        prompt_results.append(result)

    # 生成圖片
    import asyncio
    from services.comfy_service import MiniMaxService

    service = MiniMaxService()

    generated_images = []
    for i in range(scene_count):
        prompt_data = prompt_results[i]
        
        # 使用完整 SeedDance prompt 生成圖片
        result = asyncio.run(service.generate_with_reference(
            prompt=prompt_data["full_seeddance_prompt"],
            reference_images=reference_paths if reference_paths else [],
            model="image-01",
            aspect_ratio="1:1"
        ))

        if result.get("status") == "success":
            images = result.get("images", [])
            if images:
                # 保存第一張圖片 + prompt 資料
                generated_images.append({
                    "image_base64": images[0],
                    "prompt": prompt_data["full_seeddance_prompt"],
                    "scene_type": scene_type,
                    "subject_segment": prompt_data["subject_segment"],
                    "setting_segment": prompt_data["setting_segment"],
                    "atmosphere_segment": prompt_data["atmosphere_segment"],
                    "camera_segment": prompt_data["camera_segment"],
                    "technical_segment": prompt_data["technical_segment"],
                    "full_seeddance_prompt": prompt_data["full_seeddance_prompt"],
                    "location_tags": json.dumps(prompt_data["location_tags"]),
                    "emotion_tags": json.dumps(prompt_data["emotion_tags"]),
                    "action_tags": json.dumps(prompt_data["action_tags"]),
                    "diary_context": prompt_data["diary_context"],
                })

    # 儲存到資料庫
    conn = get_connection()
    cursor = conn.cursor()

    saved_images = []
    for img_data in generated_images:
        # 解碼並儲存圖片
        import base64
        image_data = base64.b64decode(img_data["image_base64"])

        # 儲存路徑
        portfolio_dir = ASSETS_DIR / "characters" / str(char_id) / "portfolio"
        portfolio_dir.mkdir(parents=True, exist_ok=True)

        filename = f"portfolio_{scene_type}_{int(time.time())}_{len(saved_images)}.png"
        file_path = portfolio_dir / filename

        with open(file_path, "wb") as f:
            f.write(image_data)

        # 合併 tags（從 location, emotion, action 合併）
        all_tags = []
        all_tags.extend(img_data["location_tags"])
        all_tags.extend(img_data["emotion_tags"])
        all_tags.extend(img_data["action_tags"])
        all_tags_json = json.dumps(list(set(all_tags))) if all_tags else "[]"

        # 寫入資料庫（包含所有 SeedDance 提示詞欄位）
        cursor.execute("""
            INSERT INTO character_portfolio
            (character_id, image_path, scene_type, scene_description, prompt_used,
             subject_segment, setting_segment, atmosphere_segment, camera_segment,
             technical_segment, full_seeddance_prompt, location_tags, emotion_tags,
             action_tags, tags, diary_context)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            char_id,
            str(file_path),
            img_data["scene_type"],
            scene_description,
            img_data["prompt"],
            img_data["subject_segment"],
            img_data["setting_segment"],
            img_data["atmosphere_segment"],
            img_data["camera_segment"],
            img_data["technical_segment"],
            img_data["full_seeddance_prompt"],
            img_data["location_tags"],
            img_data["emotion_tags"],
            img_data["action_tags"],
            all_tags_json,
            img_data["diary_context"]
        ))

        saved_images.append({
            "path": str(file_path),
            "scene_type": img_data["scene_type"],
            "subject": img_data["subject_segment"],
            "setting": img_data["setting_segment"],
            "atmosphere": img_data["atmosphere_segment"],
            "camera": img_data["camera_segment"],
            "tags": all_tags
        })

    conn.commit()
    conn.close()

    return {
        "message": f"已生成 {len(saved_images)} 張影集圖片（含 SeedDance 提示詞）",
        "images": saved_images,
        "character_id": char_id,
        "scene_type": scene_type,
        "prompt_preview": prompt_results[0]["full_seeddance_prompt"] if prompt_results else ""
    }


@router.patch("/characters/{char_id}/portfolio/{portfolio_id}")
def update_portfolio_image(char_id: int, portfolio_id: int, req: dict):
    """更新影集圖片資訊（標籤、是否為參考圖等）"""
    conn = get_connection()
    cursor = conn.cursor()

    # 確認圖片存在
    img_row = cursor.execute(
        "SELECT * FROM character_portfolio WHERE id = ? AND character_id = ?",
        (portfolio_id, char_id)
    ).fetchone()

    if not img_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Portfolio image not found")

    # 更新欄位
    updates = []
    params = []

    if "scene_type" in req:
        updates.append("scene_type = ?")
        params.append(req["scene_type"])

    if "scene_description" in req:
        updates.append("scene_description = ?")
        params.append(req["scene_description"])

    if "tags" in req:
        updates.append("tags = ?")
        params.append(json.dumps(req["tags"]) if isinstance(req["tags"], list) else req["tags"])

    if "is_reference" in req:
        updates.append("is_reference = ?")
        params.append(1 if req["is_reference"] else 0)

    if "sort_order" in req:
        updates.append("sort_order = ?")
        params.append(req["sort_order"])

    if "seeddance_video_url" in req:
        updates.append("seeddance_video_url = ?")
        params.append(req["seeddance_video_url"])

    if updates:
        params.extend([portfolio_id, char_id])
        cursor.execute(
            f"UPDATE character_portfolio SET {', '.join(updates)} WHERE id = ? AND character_id = ?",
            params
        )
        conn.commit()

    conn.close()

    return {"message": "影集圖片已更新", "id": portfolio_id}


@router.post("/characters/{char_id}/portfolio/generate-prompt")
def generate_portfolio_prompt_only(char_id: int, req: dict = {}):
    """
    只生成 SeedDance 提示詞，不生成圖片
    用於：用戶想要自己去 SeedDance 網站生成影片的場景

    流程：
    1. 根據角色設定 + 日記生成 SeedDance 提示詞
    2. 儲存提示詞到資料庫（不生成圖片）
    3. 用戶拿到提示詞，去 SeedDance 生成影片
    4. 用戶把 SeedDance 影片網址貼回來，更新到同一筆資料
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    char = dict(char_row)

    # 檢查是否已達上限 (50)
    current_count = cursor.execute(
        "SELECT COUNT(*) FROM character_portfolio WHERE character_id = ?",
        (char_id,)
    ).fetchone()[0]

    if current_count >= 50:
        conn.close()
        raise HTTPException(status_code=400, detail="已達影集上限 (50張)")

    # 取得參數
    scene_type = req.get("scene_type", "solo")
    scene_description = req.get("scene_description", "")

    # 取得角色最近的日記
    diary_rows = cursor.execute("""
        SELECT * FROM character_diaries
        WHERE character_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    """, (char_id,)).fetchall()
    diaries = [dict(row) for row in diary_rows]

    conn.close()

    # 使用 PortfolioPromptGenerator 生成提示詞
    prompt_generator = PortfolioPromptGenerator()
    prompt_data = prompt_generator.generate_portfolio_prompt(
        character=char,
        diaries=diaries,
        scene_type=scene_type,
        scene_description=scene_description
    )

    # 建立一個「待填入影片」的影集項目
    # 使用 placeholder 圖片路徑，表示尚未有實際圖片
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO character_portfolio
        (character_id, image_path, scene_type, scene_description,
         subject_segment, setting_segment, atmosphere_segment,
         camera_segment, technical_segment, full_seeddance_prompt,
         location_tags, emotion_tags, action_tags, diary_context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        char_id,
        "/assets/placeholders/pending.png",  # placeholder
        scene_type,
        scene_description,
        prompt_data["subject_segment"],
        prompt_data["setting_segment"],
        prompt_data["atmosphere_segment"],
        prompt_data["camera_segment"],
        prompt_data["technical_segment"],
        prompt_data["full_seeddance_prompt"],
        json.dumps(prompt_data["location_tags"]),
        json.dumps(prompt_data["emotion_tags"]),
        json.dumps(prompt_data["action_tags"]),
        prompt_data["diary_context"]
    ))

    portfolio_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": portfolio_id,
        "message": "提示詞已生成，請複製後去 SeedDance 生成影片，完成後將網址貼回",
        "scene_type": scene_type,
        "prompt": prompt_data["full_seeddance_prompt"],
        "segments": {
            "subject": prompt_data["subject_segment"],
            "setting": prompt_data["setting_segment"],
            "atmosphere": prompt_data["atmosphere_segment"],
            "camera": prompt_data["camera_segment"],
            "technical": prompt_data["technical_segment"]
        },
        "tags": {
            "location": prompt_data["location_tags"],
            "emotion": prompt_data["emotion_tags"],
            "action": prompt_data["action_tags"]
        }
    }


@router.delete("/characters/{char_id}/portfolio/{portfolio_id}")
def delete_portfolio_image(char_id: int, portfolio_id: int):
    """刪除影集圖片"""
    conn = get_connection()
    cursor = conn.cursor()

    # 確認圖片存在
    img_row = cursor.execute(
        "SELECT * FROM character_portfolio WHERE id = ? AND character_id = ?",
        (portfolio_id, char_id)
    ).fetchone()

    if not img_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Portfolio image not found")

    img = dict(img_row)

    # 刪除檔案
    if img.get("image_path"):
        try:
            Path(img["image_path"]).unlink(missing_ok=True)
        except:
            pass

    # 刪除資料庫記錄
    cursor.execute(
        "DELETE FROM character_portfolio WHERE id = ? AND character_id = ?",
        (portfolio_id, char_id)
    )
    conn.commit()
    conn.close()

    return {"message": "影集圖片已刪除", "id": portfolio_id}


@router.post("/characters/{char_id}/portfolio/{portfolio_id}/video")
async def upload_portfolio_video(char_id: int, portfolio_id: int, file: UploadFile = File(...)):
    """
    上傳 SeedDance 影片檔案到影集項目
    支援 mp4, mov, webm 等影片格式
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 確認影集項目存在且屬於該角色
    img_row = cursor.execute(
        "SELECT * FROM character_portfolio WHERE id = ? AND character_id = ?",
        (portfolio_id, char_id)
    ).fetchone()

    if not img_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Portfolio image not found")

    conn.close()

    # 驗證檔案類型
    allowed_types = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]
    content_type = file.content_type or ""

    # 也允許常見的影片副檔名
    allowed_extensions = [".mp4", ".mov", ".webm", ".avi"]
    file_lower = file.filename.lower() if file.filename else ""

    is_valid = (
        content_type in allowed_types or
        any(file_lower.endswith(ext) for ext in allowed_extensions)
    )

    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"不支援的影片格式。支援：mp4, mov, webm, avi"
        )

    # 建立影片資料夾
    video_dir = ASSETS_DIR / "characters" / str(char_id) / "videos"
    video_dir.mkdir(parents=True, exist_ok=True)

    # 生成唯一檔名避免覆蓋
    import uuid
    ext = "".join([c for c in (file.filename or "video.mp4") if c.isalnum() or c in ".-_"])
    safe_filename = f"{uuid.uuid4().hex[:8]}_{ext}"
    file_path = video_dir / safe_filename

    # 儲存檔案
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 更新資料庫
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE character_portfolio SET seeddance_video_url = ? WHERE id = ?",
        (str(file_path), portfolio_id)
    )
    conn.commit()
    conn.close()

    return {
        "message": "影片已上傳",
        "path": str(file_path),
        "filename": file.filename,
        "portfolio_id": portfolio_id
    }


@router.get("/characters/{char_id}/portfolio/search")
def search_portfolio_images(char_id: int, q: str = ""):
    """
    搜尋角色的影集圖片
    
    根據關鍵字搜尋標籤、地點、情緒、動作等，
    回傳符合條件的影集圖片供後續影片片段調用
    
    搜尋範圍：
    - location_tags（地點標籤，如「捷運」、「咖啡廳」）
    - emotion_tags（情緒標籤，如「心動」、「期待」）
    - action_tags（動作標籤，如「奔跑」、「等待」）
    - subject_segment（主體描述）
    - setting_segment（場景設定）
    - diary_context（日記內容摘要）
    
    Example: GET /characters/1/portfolio/search?q=捷運
    """
    conn = get_connection()
    cursor = conn.cursor()

    # 確認角色存在
    char_row = cursor.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not char_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    if not q or len(q.strip()) < 1:
        conn.close()
        raise HTTPException(status_code=400, detail="請提供搜尋關鍵字")

    search_term = f"%{q.strip()}%"

    # 搜尋符合條件的圖片
    images = cursor.execute("""
        SELECT p.*, c.name as character_name
        FROM character_portfolio p
        LEFT JOIN characters c ON p.character_id = c.id
        WHERE p.character_id = ?
          AND (
              p.tags LIKE ?
              OR p.location_tags LIKE ?
              OR p.emotion_tags LIKE ?
              OR p.action_tags LIKE ?
              OR p.subject_segment LIKE ?
              OR p.setting_segment LIKE ?
              OR p.atmosphere_segment LIKE ?
              OR p.diary_context LIKE ?
              OR p.full_seeddance_prompt LIKE ?
          )
        ORDER BY p.created_at DESC
        LIMIT 20
    """, (
        char_id,
        search_term, search_term, search_term, search_term,
        search_term, search_term, search_term, search_term, search_term
    )).fetchall()

    results = []
    for img in images:
        d = dict(img)
        # 解析 tags JSON
        for tag_field in ["tags", "location_tags", "emotion_tags", "action_tags"]:
            if d.get(tag_field):
                try:
                    d[tag_field] = json.loads(d[tag_field])
                except:
                    d[tag_field] = []
        results.append(d)

    conn.close()

    return {
        "query": q,
        "count": len(results),
        "results": results
    }


@router.get("/portfolio/reference-images")
def get_all_reference_images():
    """取得所有角色的參考圖片（可用於 MV 腳本）"""
    conn = get_connection()
    cursor = conn.cursor()

    images = cursor.execute("""
        SELECT p.*, c.name as character_name, c.character_number
        FROM character_portfolio p
        JOIN characters c ON p.character_id = c.id
        WHERE p.is_reference = 1
        ORDER BY c.character_number, p.id
    """).fetchall()

    conn.close()

    result = []
    for img in images:
        d = dict(img)
        if d.get("tags"):
            try:
                d["tags"] = json.loads(d["tags"])
            except:
                d["tags"] = []
        result.append(d)

    return {"images": result}


# ============ 日記有聲配音 TTS ============
from services.diary_tts_service import DiaryTTSService

diary_tts = DiaryTTSService()

# Watchdog integration — 讓後端可以回報活躍狀態
import subprocess, sys, json
from pathlib import Path as _Path
_watchdog_script = _Path(__file__).parent.parent.parent / "scripts" / "watchdog.py"
sys.path.insert(0, str(_Path(__file__).parent.parent.parent / "scripts"))
try:
    from watchdog import touch_activity as _touch_activity, minutes_since_activity as _mins_since, get_pending_tasks as _get_pending
except ImportError:
    _touch_activity = None
    _mins_since = lambda: 999
    _get_pending = lambda: []

@router.get("/watchdog/touch")
def watchdog_touch():
    """後端主動告知 watchdog 有新活動（任何 API 呼叫都算活躍）"""
    if _touch_activity:
        _touch_activity()
    return {"ok": True, "now": datetime.now().isoformat()}


@router.get("/watchdog/status")
def watchdog_status():
    """取得 watchdog 狀態：閒置分鐘數 + 待辦任務"""
    mins = _mins_since()
    pending = _get_pending()
    return {
        "minutes_idle": mins,
        "is_idle": mins >= 10,
        "pending_tasks": [{"id": t["id"], "title": t["title"], "priority": t["priority"]} for t in pending[:5]],
        "pending_count": len(pending),
    }


@router.get("/tts/voices")
def list_tts_voices():
    """列出所有可用音色"""
    import asyncio
    return asyncio.run(diary_tts.list_voices())


@router.post("/diaries/{diary_id}/audio")
def generate_diary_audio(diary_id: int, req: dict = None):
    """
    為日記生成有聲配音

    - diary_id: 日記ID
    - voice_id: 音色ID（可選）
    """
    conn = get_connection()
    cursor = conn.cursor()

    diary_row = cursor.execute(
        "SELECT * FROM character_diaries WHERE id = ?", (diary_id,)
    ).fetchone()

    if not diary_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Diary not found")

    diary = dict(diary_row)
    voice_id = "Chinese (Mandarin)_Warm_Girl"
    speed = 1.0
    pitch = 0.0

    # 如果有指定音色就用指定的（覆蓋角色設定），否則取角色完整設定
    if req and req.get("voice_id"):
        voice_id = req["voice_id"]
        speed = float(req.get("speed", 1.0))
        pitch = float(req.get("pitch", 0.0))
    else:
        char_row = cursor.execute(
            "SELECT voice_id, voice_speed, voice_pitch FROM characters WHERE id = ?",
            (diary["character_id"],)
        ).fetchone()
        if char_row:
            voice_id = char_row["voice_id"] or voice_id
            speed = char_row["voice_speed"] if char_row["voice_speed"] is not None else 1.0
            pitch = char_row["voice_pitch"] if char_row["voice_pitch"] is not None else 0.0

    # 限制參數範圍
    speed = max(0.5, min(2.0, speed))
    pitch = max(-12.0, min(12.0, pitch))

    conn.close()

    import asyncio
    audio_url = asyncio.run(
        diary_tts.generate_diary_audio(diary_id, diary["content"], voice_id, speed, pitch)
    )

    if not audio_url:
        raise HTTPException(status_code=500, detail="TTS generation failed")

    # 回傳 audio_url 以及本地實體路徑（供 Whisper 使用）
    audio_local_path = str(diary_tts._get_audio_path(diary_id))
    return {"audio_url": audio_url, "audio_path": audio_local_path}


@router.get("/diaries/{diary_id}/audio")
def get_diary_audio(diary_id: int):
    """取得日記音訊 URL（已生成過的直接回傳）"""
    conn = get_connection()
    cursor = conn.cursor()

    diary_row = cursor.execute(
        "SELECT * FROM character_diaries WHERE id = ?", (diary_id,)
    ).fetchone()

    if not diary_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Diary not found")

    diary = dict(diary_row)
    conn.close()

    audio_path = diary_tts._get_audio_path(diary_id)
    if audio_path.exists():
        return {"audio_url": f"/diary_audio/diary_{diary_id}.mp3", "exists": True}

    return {"audio_url": None, "exists": False}


@router.put("/characters/{character_id}/voice")
def update_character_voice(character_id: int, req: dict):
    """更新角色的預設音色 + speed + pitch"""
    voice_id = req.get("voice_id", "Chinese (Mandarin)_Warm_Girl")
    speed = float(req.get("speed", 1.0))
    pitch = float(req.get("pitch", 0.0))

    # 限制範圍
    speed = max(0.5, min(2.0, speed))
    pitch = max(-12.0, min(12.0, pitch))

    conn = get_connection()
    cursor = conn.cursor()

    char = cursor.execute(
        "SELECT id FROM characters WHERE id = ?", (character_id,)
    ).fetchone()

    if not char:
        conn.close()
        raise HTTPException(status_code=404, detail="Character not found")

    # 確保欄位存在
    for col_sql in [
        "ALTER TABLE characters ADD COLUMN voice_id TEXT DEFAULT 'female-tianmei'",
        "ALTER TABLE characters ADD COLUMN voice_speed REAL DEFAULT 1.0",
        "ALTER TABLE characters ADD COLUMN voice_pitch REAL DEFAULT 0.0",
    ]:
        try:
            cursor.execute(col_sql)
        except:
            pass

    cursor.execute(
        "UPDATE characters SET voice_id = ?, voice_speed = ?, voice_pitch = ? WHERE id = ?",
        (voice_id, speed, pitch, character_id)
    )
    conn.commit()
    conn.close()

    return {"success": True, "voice_id": voice_id, "speed": speed, "pitch": pitch}


@router.get("/characters/{character_id}/voice")
def get_character_voice(character_id: int):
    """取得角色的預設音色 + speed + pitch"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        row = cursor.execute(
            "SELECT voice_id, voice_speed, voice_pitch FROM characters WHERE id = ?", (character_id,)
        ).fetchone()
    except:
        row = None

    conn.close()

    return {
        "voice_id": row["voice_id"] if row and row["voice_id"] else "Chinese (Mandarin)_Warm_Girl",
        "speed": row["voice_speed"] if row and row["voice_speed"] is not None else 1.0,
        "pitch": row["voice_pitch"] if row and row["voice_pitch"] is not None else 0.0,
    }


@router.post("/tts/generate")
def generate_tts_audio(req: dict):
    """
    測試音色：输入文字 + 音色ID，生成音頻並返回 URL
    用於音色選擇頁面試聽
    """
    text = req.get("text", "").strip()
    voice_id = req.get("voice_id", "Chinese (Mandarin)_Warm_Girl")
    speed = float(req.get("speed", 1.0))
    pitch = float(req.get("pitch", 0.0))

    if not text:
        raise HTTPException(status_code=400, detail="文字內容不可為空")

    # 限制長度避免費用超支
    if len(text) > 500:
        text = text[:500]

    # 限制參數範圍
    speed = max(0.5, min(2.0, speed))
    pitch = max(-12.0, min(12.0, pitch))

    import asyncio
    audio_url = asyncio.run(
        diary_tts.generate_test_audio(text, voice_id, speed, pitch)
    )

    if not audio_url:
        raise HTTPException(status_code=500, detail="TTS 生成失敗")

    return {"audio_url": audio_url}


# === Whisper Routes ===

@router.post("/whisper/transcribe")
def transcribe_audio_route(req: dict):
    """
    將音頻檔轉為 SRT 字幕。
    Request: { "audio_path": "/path/to/audio.mp3", "language": "zh", "model": "base" }
    Response: { "success": true, "srt_path": "/subtitles/xxx.srt", "srt_url": "/subtitles/xxx.srt" }
    """
    audio_path = req.get("audio_path", "").strip()
    language   = req.get("language", "zh")
    model      = req.get("model", "base")

    if not audio_path:
        raise HTTPException(status_code=400, detail="audio_path 不可為空")

    from services.whisper_service import transcribe_and_save
    import os
    # 支援兩種音頻位置：絕對路徑 或 後端相對路徑
    if not os.path.isabs(audio_path):
        audio_path = audio_path.lstrip("/")
        audio_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", audio_path)
    audio_path = os.path.normpath(audio_path)

    ok, srt_path, err = transcribe_and_save(audio_path, language=language, model=model)
    if not ok:
        return {"success": False, "error": err[:200]}

    # 回傳 URL（去除 backend/ 路徑前綴）
    srt_url = srt_path.split("manga-studio/")[-1]
    srt_url = "/" + srt_url.replace("\\", "/")
    return {"success": True, "srt_path": srt_path, "srt_url": srt_url}


@router.get("/whisper/subtitles/{filename}")
def get_subtitle_file(filename: str):
    """取得 SRT 字幕檔內容"""
    from fastapi.responses import FileResponse
    subtitle_dir = Path(__file__).parent.parent.parent / "data" / "assets" / "subtitles"
    file_path = subtitle_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="字幕檔不存在")
    return FileResponse(str(file_path), media_type="text/plain")


# === Automation Routes ===

@router.get("/automation/status")
def get_automation_status():
    """取得自動化系統狀態"""
    from datetime import datetime
    conn = get_connection()
    cursor = conn.cursor()

    char_count = cursor.execute("SELECT COUNT(*) FROM characters").fetchone()[0]
    diary_count = cursor.execute("SELECT COUNT(*) FROM character_diaries").fetchone()[0]
    song_count = cursor.execute("SELECT COUNT(*) FROM character_songs").fetchone()[0]

    last_diary = cursor.execute("SELECT created_at FROM character_diaries ORDER BY created_at DESC LIMIT 1").fetchone()
    last_song = cursor.execute("SELECT created_at FROM character_songs ORDER BY created_at DESC LIMIT 1").fetchone()

    conn.close()

    return {
        "characters": char_count,
        "diaries": diary_count,
        "songs": song_count,
        "last_diary_at": last_diary[0] if last_diary else None,
        "last_song_at": last_song[0] if last_song else None,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/songs")
def list_all_songs():
    """取得所有歌曲"""
    conn = get_connection()
    cursor = conn.cursor()
    songs = cursor.execute("""
        SELECT s.*, c.name as character_name, c.voice_id, c.music_genre, c.music_mood, c.music_tempo
        FROM character_songs s
        LEFT JOIN characters c ON s.character_id = c.id
        ORDER BY s.character_id, s.id
    """).fetchall()
    conn.close()
    return [dict(s) for s in songs]


@router.get("/diaries")
def list_all_diaries():
    """取得所有日記"""
    conn = get_connection()
    cursor = conn.cursor()
    diaries = cursor.execute("""
        SELECT d.*, c.name as character_name
        FROM character_diaries d
        LEFT JOIN characters c ON d.character_id = c.id
        ORDER BY d.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(d) for d in diaries]


@router.post("/automation/run")
def trigger_automation(mode: str = "full"):
    """手動觸發自動化生成"""
    import subprocess
    result = subprocess.run(
        ["/Library/Frameworks/Python.framework/Versions/3.13/bin/python3.13",
         "/Volumes/Transcend/manga-studio/scripts/daily_automation.py",
         "--mode", mode],
        capture_output=True, text=True, timeout=300
    )
    return {
        "mode": mode,
        "message": "自動化生成已完成" if result.returncode == 0 else "執行失敗",
        "output": result.stdout[-500:] if result.stdout else "",
        "error": result.stderr[-200:] if result.stderr else "",
    }


# === Video Editor Routes ===

@router.post("/video/editor/compose-clip")
def compose_video_clip(req: dict):
    """
    從一張圖片 + 語音生成短影片。

    Request body:
    {
      "image_path": "/path/to/image.jpg",
      "audio_path": "/path/to/audio.mp3",
      "subtitle_text": "optional subtitle",
      "output_name": "my_clip"
    }
    """
    from services.video_editor_service import compose_clip_with_audio
    import uuid

    image_path  = req.get("image_path", "")
    audio_path  = req.get("audio_path", "")
    subtitle    = req.get("subtitle_text")
    output_name = req.get("output_name", f"clip_{uuid.uuid4().hex[:8]}")

    if not image_path or not audio_path:
        raise HTTPException(status_code=400, detail="image_path 和 audio_path 不可為空")

    from pathlib import Path
    output_dir = Path(__file__).parent.parent.parent / "data" / "assets" / "video_clips"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = str(output_dir / f"{output_name}.mp4")

    ok, err, duration = compose_clip_with_audio(
        image_path=str(image_path),
        audio_path=str(audio_path),
        output_path=output_path,
        subtitle_text=subtitle,
    )

    if not ok:
        return {"success": False, "error": err[:200], "duration": 0}

    clip_url = f"/video_clips/{output_name}.mp4"
    return {"success": True, "clip_url": clip_url, "duration": round(duration, 1)}


@router.post("/video/editor/compose-multi")
def compose_multi_segment(req: dict):
    """
    從多段（圖片+音檔）合成一支影片。

    Request body:
    {
      "segments": [
        {"image_path": "...", "audio_path": "...", "subtitle_text": "..."},
        ...
      ],
      "output_name": "my_video"
    }
    """
    from services.video_editor_service import compose_from_images_and_audios

    segments    = req.get("segments", [])
    output_name = req.get("output_name", f"multi_{uuid.uuid4().hex[:8]}")

    if not segments:
        raise HTTPException(status_code=400, detail="segments 不可為空")

    from pathlib import Path
    output_dir   = Path(__file__).parent.parent.parent / "data" / "assets" / "video_clips"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path  = str(output_dir / f"{output_name}.mp4")

    # Convert paths to string
    pairs = []
    for seg in segments:
        pairs.append({
            "image_path": str(seg["image_path"]),
            "audio_path": str(seg["audio_path"]),
            "subtitle_text": seg.get("subtitle_text"),
        })

    ok, err = compose_from_images_and_audios(pairs, output_path)

    if not ok:
        return {"success": False, "error": err[:200]}

    video_url = f"/video_clips/{output_name}.mp4"
    return {"success": True, "video_url": video_url}


@router.post("/video/editor/add-subtitles")
def add_video_subtitles(req: dict):
    """
    將 SRT 字幕燒入影片。

    Request body:
    {
      "video_path": "/path/to/input.mp4",
      "srt_path": "/path/to/subs.srt",
      "output_name": "subtitled"
    }
    """
    from services.video_editor_service import burn_subtitles
    import uuid

    video_path   = req.get("video_path", "")
    srt_path     = req.get("srt_path", "")
    output_name  = req.get("output_name", f"sub_{uuid.uuid4().hex[:8]}")

    if not video_path or not srt_path:
        raise HTTPException(status_code=400, detail="video_path 和 srt_path 不可為空")

    from pathlib import Path
    output_dir  = Path(__file__).parent.parent.parent / "data" / "assets" / "video_clips"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = str(output_dir / f"{output_name}.mp4")

    ok, err = burn_subtitles(str(video_path), output_path, str(srt_path))

    if not ok:
        return {"success": False, "error": err[:200]}

    return {"success": True, "video_url": f"/video_clips/{output_name}.mp4"}


# === Travel Postcard Image Generation Routes ===

@router.post("/travel/generate-image")
async def generate_travel_image(req: dict):
    """
    使用 MiniMax 為旅遊行程生成卡通插圖。

    Request body:
    {
      "prompt": "A cute kawaii style travel illustration for Day 1...",
      "aspect_ratio": "16:9"  // 可選，預設 "1:1"
    }

    Response:
    {
      "status": "success",
      "image_base64": "...",
      "image_url": "/travel-images/xxx.png"
    }
    """
    from services.comfy_service import MiniMaxService

    prompt = req.get("prompt", "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt 不可為空")

    aspect_ratio = req.get("aspect_ratio", "1:1")

    mini_max = MiniMaxService()
    result = await mini_max.generate_image(
        prompt=prompt,
        aspect_ratio=aspect_ratio
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))

    images = result.get("images", [])
    if not images:
        raise HTTPException(status_code=500, detail="No images returned")

    # 儲存圖片到 static 目錄
    import base64
    img_data = base64.b64decode(images[0])

    travel_images_dir = Path(__file__).parent.parent.parent / "data" / "assets" / "travel-images"
    travel_images_dir.mkdir(parents=True, exist_ok=True)

    filename = f"travel_{int(time.time())}_{random.randint(1000, 9999)}.png"
    file_path = travel_images_dir / filename

    with open(file_path, "wb") as f:
        f.write(img_data)

    image_url = f"/travel-images/{filename}"

    return {
        "status": "success",
        "image_base64": images[0],
        "image_url": image_url,
        "prompt": prompt
    }
