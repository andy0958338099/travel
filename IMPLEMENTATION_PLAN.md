# Manga Studio — 漫劇生成系統實作規劃

> **For Hermes:** 使用 subagent-driven-development skill 逐項執行每個 task。

**目標：** 在本地建立一個確保「角色與場景一致性」的漫劇（動漫/長篇劇集）生成系統。

**核心架構：**
- 前端：Next.js 14 (App Router) + React
- 後端：FastAPI (Python)
- 資料庫：SQLite（輕量、免伺服器）
- AI 生成：Comfy Cloud API（圖） + SeedDance/Vidu2（影片）
- 儲存：/Volumes/Transcend/manga-studio/

**硬體環境：**
- macOS 15.7.5 Intel Mac + AMD Radeon Pro 570X (4GB VRAM)
- 建議使用 Comfy Cloud 進行生成任務

---

## Phase 1：專案骨架 (Project Scaffolding)

### Task 1: 建立後端 FastAPI 專案結構

**目標：** 建立 FastAPI 後端基礎設施

**檔案：**
- Create: `backend/main.py`
- Create: `backend/requirements.txt`
- Create: `backend/api/__init__.py`
- Create: `backend/api/routes.py`
- Create: `backend/db/__init__.py`
- Create: `backend/db/database.py`
- Create: `backend/db/models.py`
- Create: `backend/services/__init__.py`
- Create: `backend/services/asset_manager.py`
- Create: `backend/services/comfy_service.py`
- Create: `backend/services/video_service.py`

**Step 1: 建立 FastAPI 主程式**

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router

app = FastAPI(title="Manga Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
```

**Step 2: 建立資料庫模型**

```python
# backend/db/models.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Character(BaseModel):
    id: Optional[int] = None
    name: str
    description: str
    lora_path: Optional[str] = None
    seed: Optional[int] = None
    style: Optional[str] = None
    created_at: datetime = None

class Scene(BaseModel):
    id: Optional[int] = None
    name: str
    description: str
    background_path: Optional[str] = None
    style: str
    created_at: datetime = None

class Episode(BaseModel):
    id: Optional[int] = None
    title: str
    script: str
    status: str = "draft"  # draft, generating, complete
    created_at: datetime = None

class GenerationJob(BaseModel):
    id: Optional[int] = None
    episode_id: int
    character_id: int
    scene_id: int
    prompt: str
    seed: int
    status: str = "pending"
    output_path: Optional[str] = None
    created_at: datetime = None
```

**Step 3: 建立 SQLite 資料庫**

```python
# backend/db/database.py
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "manga_studio.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            lora_path TEXT,
            seed INTEGER,
            style TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS scenes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            background_path TEXT,
            style TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            script TEXT,
            status TEXT DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS generation_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            episode_id INTEGER,
            character_id INTEGER,
            scene_id INTEGER,
            prompt TEXT,
            seed INTEGER,
            status TEXT DEFAULT 'pending',
            output_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(episode_id) REFERENCES episodes(id),
            FOREIGN KEY(character_id) REFERENCES characters(id),
            FOREIGN KEY(scene_id) REFERENCES scenes(id)
        );
    """)
    conn.commit()
    conn.close()
```

**Step 4: 建立 API 路由**

```python
# backend/api/routes.py
from fastapi import APIRouter, HTTPException
from db.database import get_connection, init_db
from db.models import Character, Scene, Episode, GenerationJob

router = APIRouter()
init_db()

@router.get("/characters")
def list_characters():
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM characters").fetchall()
    return [dict(row) for row in rows]

@router.post("/characters")
def create_character(char: Character):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO characters (name, description, lora_path, seed, style) VALUES (?, ?, ?, ?, ?)",
        (char.name, char.description, char.lora_path, char.seed, char.style)
    )
    conn.commit()
    char_id = cursor.lastrowid
    conn.close()
    return {"id": char_id, **char.dict()}

@router.get("/scenes")
def list_scenes():
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM scenes").fetchall()
    return [dict(row) for row in rows]

@router.post("/scenes")
def create_scene(scene: Scene):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO scenes (name, description, background_path, style) VALUES (?, ?, ?, ?)",
        (scene.name, scene.description, scene.background_path, scene.style)
    )
    conn.commit()
    scene_id = cursor.lastrowid
    conn.close()
    return {"id": scene_id, **scene.dict()}

@router.get("/episodes")
def list_episodes():
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM episodes").fetchall()
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
    return {"id": ep_id, **episode.dict()}
```

**Step 5: 安裝依賴**

```bash
cd /Volumes/Transcend/manga-studio/backend
pip install fastapi uvicorn pydantic aiohttp python-multipart
```

**Step 6: 測試後端**

```bash
cd /Volumes/Transcend/manga-studio/backend
uvicorn main:app --reload --port 8000
# Expected: Uvicorn running on http://127.0.0.1:8000
```

---

### Task 2: 建立前端 Next.js 專案

**目標：** 建立 Next.js 14 App Router 前端基礎

**Step 1: 初始化 Next.js**

```bash
cd /Volumes/Transcend/manga-studio/frontend
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

**Step 2: 建立儀表板頁面**

```tsx
# frontend/app/dashboard/page.tsx
import { Card } from "@/components/Card";

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Manga Studio</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="角色" href="/characters" count={0} />
        <Card title="場景" href="/scenes" count={0} />
        <Card title="集數" href="/episodes" count={0} />
        <Card title="生成" href="/generate" count={0} />
      </div>
    </div>
  );
}
```

**Step 3: 建立 API 客戶端**

```typescript
# frontend/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function getCharacters() {
  const res = await fetch(`${API_BASE}/characters`);
  return res.json();
}

export async function createCharacter(data: any) {
  const res = await fetch(`${API_BASE}/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
```

**Step 4: 啟動前端**

```bash
cd /Volumes/Transcend/manga-studio/frontend
npm run dev
# Expected: http://localhost:3000
```

---

## Phase 2：資產管理系統 (Asset Management)

### Task 3: 建立角色資產系統

**目標：** 建立角色上傳、Lora 管理、Seed 追蹤功能

**功能：**
- 上傳角色參考圖（360度視角）
- 儲存生成時使用的 seed 值
- 關聯 LoRA 模型路徑
- 自動生成角色描述檔

**Step 1: 建立角色上傳 API**

```python
# backend/api/routes.py 新增
from fastapi import UploadFile, File
import shutil
from pathlib import Path

ASSETS_DIR = Path(__file__).parent.parent.parent / "assets"

@router.post("/characters/{id}/upload")
async def upload_character_image(id: int, file: UploadFile = File(...)):
    char_dir = ASSETS_DIR / "characters" / str(id)
    char_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = char_dir / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"path": str(file_path)}
```

**Step 2: 建立角色管理前端頁面**

```tsx
# frontend/app/characters/page.tsx
"use client";
import { useState, useEffect } from "react";
import { getCharacters, createCharacter } from "@/lib/api";

export default function CharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", style: "" });

  useEffect(() => {
    getCharacters().then(setCharacters);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newChar = await createCharacter(form);
    setCharacters([...characters, newChar]);
    setForm({ name: "", description: "", style: "" });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">角色管理</h1>
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <input
          placeholder="角色名稱"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="描述"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="border p-2 rounded"
        />
        <input
          placeholder="風格"
          value={form.style}
          onChange={(e) => setForm({ ...form, style: e.target.value })}
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          新增角色
        </button>
      </form>
      <div className="grid grid-cols-3 gap-4">
        {characters.map((char: any) => (
          <div key={char.id} className="border p-4 rounded">
            <h3 className="font-bold">{char.name}</h3>
            <p className="text-sm text-gray-600">{char.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 4: 建立場景資產系統

**目標：** 建立場景模板管理、背景圖上傳功能

**功能：**
- 場景目錄管理（室內/室外/特定地點）
- 背景圖上傳與預覽
- 場景風格統一設定

---

## Phase 3：Comfy Cloud 整合 (Image Generation)

### Task 5: 設定 Comfy Cloud API

**目標：** 串接 Comfy Cloud 進行圖片生成

**Step 1: 安裝 Comfy Cloud CLI**

```bash
pip install comfy-cli
comfy --skip-prompt tracking disable
```

**Step 2: 設定 API Key**

```bash
export COMFY_CLOUD_API_KEY="comfyui-xxxxx-your-key"
```

**Step 3: 建立 Comfy Service**

```python
# backend/services/comfy_service.py
import aiohttp
import json
from pathlib import Path

COMFY_CLOUD_URL = "https://cloud.comfy.org/api"
API_KEY = None  # 從環境變數讀取

async def generate_image(prompt: str, negative_prompt: str = "", seed: int = -1, 
                          steps: int = 30, cfg: float = 7.5, workflow_path: str = None):
    """使用 Comfy Cloud 生成圖片"""
    headers = {"X-API-Key": API_KEY} if API_KEY else {}
    
    # 預設 workflow（SDXL txt2img）
    workflow = {
        "3": {"inputs": {"text": prompt, "clip": ["4", 0]}},
        "4": {"inputs": {"clip": ["5", 0]}},
        "5": {"inputs": {"model_name": "sd_xl_base_1.0.safetensors"}},
        "6": {"inputs": {"positive": ["3", 0], "negative": negative_prompt, 
                        "model": ["5", 0], "seed": seed, "steps": steps, 
                        "cfg": cfg}},
        "7": {"inputs": {"samples": ["6", 0]}},
        "8": {"inputs": {"sample": ["7", 0], "filename_prefix": "manga_studio"}}
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{COMFY_CLOUD_URL}/prompt",
            headers=headers,
            json={"prompt": workflow}
        ) as resp:
            return await resp.json()
```

**Step 4: 建立 Seed 追蹤系統**

```python
# backend/services/seed_tracker.py
import sqlite3
from pathlib import Path

def save_seed_record(character_id: int, scene_id: int, seed: int, 
                     prompt: str, output_path: str):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO generation_jobs (character_id, scene_id, seed, prompt, output_path, status) VALUES (?, ?, ?, ?, ?, 'success')",
        (character_id, scene_id, seed, prompt, output_path)
    )
    conn.commit()
    conn.close()

def get_best_seed_for_character(character_id: int) -> int:
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        "SELECT seed FROM generation_jobs WHERE character_id = ? AND status = 'success' ORDER BY created_at DESC LIMIT 1",
        (character_id,)
    ).fetchone()
    conn.close()
    return row[0] if row else -1
```

---

## Phase 4：影片生成整合 (Video Generation)

### Task 6: SeedDance 整合

**目標：** 串接 SeedDance 將靜態圖轉為影片

**SeedDance 參考 API：**
- 文件：https://github.com/SeedanceAI/SeedDance
- 輸入：靜態圖 + 運動提示詞
- 輸出：3-5 秒動態短片

**Step 1: 建立 Video Service**

```python
# backend/services/video_service.py
import aiohttp

SEEDDANCE_API = "http://localhost:8080"  # 本地 SeedDance 服務

async def generate_video(image_path: str, motion_prompt: str, seed: int = -1):
    """使用 SeedDance 將靜態圖轉為影片"""
    payload = {
        "image": image_path,
        "prompt": motion_prompt,
        "seed": seed,
        "duration": 5
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{SEEDDANCE_API}/generate",
            json=payload
        ) as resp:
            return await resp.json()
```

---

## Phase 5：Web UI 工作流整合

### Task 7: 建立生成頁面 (Generation Page)

**目標：** 整合所有功能，提供一站式生成介面

**功能：**
- 選擇角色 → 選擇場景 → 輸入腳本
- 預覽生成結果
- 追蹤生成進度
- Seed 回溯

**Step 1: 建立 Generation 頁面**

```tsx
# frontend/app/generate/page.tsx
"use client";
import { useState, useEffect } from "react";
import { getCharacters, getScenes, getEpisodes } from "@/lib/api";

export default function GeneratePage() {
  const [characters, setCharacters] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedChar, setSelectedChar] = useState("");
  const [selectedScene, setSelectedScene] = useState("");
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    getCharacters().then(setCharacters);
    getScenes().then(setScenes);
    getEpisodes().then(setEpisodes);
  }, []);

  const handleGenerate = async () => {
    // 呼叫後端生成 API
    const res = await fetch("http://localhost:8000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character_id: selectedChar,
        scene_id: selectedScene,
        prompt
      })
    });
    const data = await res.json();
    console.log("Generation started:", data);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">生成漫劇</h1>
      <div className="space-y-4">
        <div>
          <label className="block mb-2">選擇角色</label>
          <select 
            className="border p-2 w-full rounded"
            onChange={(e) => setSelectedChar(e.target.value)}
          >
            <option value="">-- 選擇角色 --</option>
            {characters.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-2">選擇場景</label>
          <select 
            className="border p-2 w-full rounded"
            onChange={(e) => setSelectedScene(e.target.value)}
          >
            <option value="">-- 選擇場景 --</option>
            {scenes.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-2">生成提示詞</label>
          <textarea
            className="border p-2 w-full rounded"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述這一幕的畫面..."
          />
        </div>
        <button
          onClick={handleGenerate}
          className="bg-green-500 text-white px-6 py-2 rounded"
        >
          開始生成
        </button>
      </div>
    </div>
  );
}
```

---

## Phase 6：後製與封裝 (Post-Processing)

### Task 8: TTS 與自動剪輯整合

**目標：** 為影片配上語音和字幕

**技術選項：**
- TTS：Edge TTS（免費）或 ElevenLabs
- 字幕：Whisper 自動生成
- 剪輯：FFmpeg 自動化

---

## 執行順序

1. **Phase 1 Task 1-2** — 建立前後端骨架
2. **Phase 2 Task 3-4** — 資產管理系統
3. **Phase 3 Task 5** — Comfy Cloud 串接
4. **Phase 4 Task 6** — SeedDance 影片生成
5. **Phase 5 Task 7** — 整合生成頁面
6. **Phase 6 Task 8** — 後製自動化

---

## 驗收標準

- [ ] FastAPI 後端可在 localhost:8000 正常啟動
- [ ] Next.js 前端可在 localhost:3000 正常瀏覽
- [ ] 可新增/瀏覽角色與場景
- [ ] Comfy Cloud API 串接成功（需 API Key）
- [ ] 角色一致性：相同 seed 產生相似角色
- [ ] 場景一致性：背景統一、風格一致
