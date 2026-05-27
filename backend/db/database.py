import sqlite3
from pathlib import Path
import json

DB_PATH = Path(__file__).parent.parent.parent / "data" / "manga_studio.db"
MAX_IMAGES_PER_CHARACTER = 50


def get_next_character_number() -> str:
    """生成下一個角色編號 (C001, C002, ...)"""
    conn = get_connection()
    cursor = conn.cursor()
    # 取得目前最大的編號
    row = cursor.execute(
        "SELECT character_number FROM characters WHERE character_number IS NOT NULL ORDER BY character_number DESC LIMIT 1"
    ).fetchone()
    conn.close()
    if row:
        last_num = int(row[0][1:])  # 去掉 'C' 前綴
        next_num = last_num + 1
    else:
        next_num = 1
    return f"C{next_num:03d}"  # C001, C002, ...


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()
    
    # 檢查是否需要遷移
    existing_tables = cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
    table_names = [t[0] for t in existing_tables]
    
    if "characters" not in table_names:
        # 全新建立
        cursor.executescript("""
            CREATE TABLE characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_number TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                core_features TEXT DEFAULT '',
                anchor_features TEXT DEFAULT '',
                default_outfit TEXT DEFAULT '',
                outfit_options TEXT DEFAULT '[]',
                expression_options TEXT DEFAULT '[]',
                hairstyle TEXT DEFAULT '',
                skin_tone TEXT DEFAULT '',
                style TEXT DEFAULT 'photorealistic',
                lora_path TEXT,
                seed INTEGER,
                image_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE scenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                prompt_template TEXT DEFAULT '',
                background_path TEXT,
                style TEXT DEFAULT 'anime',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE episodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                script TEXT DEFAULT '',
                status TEXT DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE generation_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                episode_id INTEGER,
                character_id INTEGER,
                scene_id INTEGER,
                prompt TEXT NOT NULL,
                seed INTEGER DEFAULT -1,
                status TEXT DEFAULT 'pending',
                output_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(episode_id) REFERENCES episodes(id),
                FOREIGN KEY(character_id) REFERENCES characters(id),
                FOREIGN KEY(scene_id) REFERENCES scenes(id)
            );
            CREATE TABLE character_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                variant_info TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
            );
            CREATE TABLE character_songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                song_path TEXT,
                prompt TEXT,
                genre TEXT DEFAULT '',
                mood TEXT DEFAULT '',
                tempo TEXT DEFAULT '',
                duration INTEGER DEFAULT 0,
                lyrics TEXT,
                song_type TEXT DEFAULT 'theme',  -- theme, bgm, variation
                status TEXT DEFAULT 'pending',  -- pending, completed, failed
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
            );
            CREATE TABLE character_diaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                mood TEXT DEFAULT '',  -- 心情: 開心,難過,生氣,害羞,期待,失落,感動,平靜
                weather TEXT DEFAULT '',  -- 天氣: 晴天,雨天,陰天,雪天
                location TEXT DEFAULT '',  -- 地點: 學校,家裡,公園,咖啡廳,海邊
                tags TEXT DEFAULT '[]',  -- 標籤: ["戀愛", "友情", "日常", "秘密"]
                related_character_id INTEGER,  -- 關聯的角色ID（記錄與誰的互動）
                is_published INTEGER DEFAULT 0,  -- 是否公開
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY(related_character_id) REFERENCES characters(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS mv_concepts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                song_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                global_style TEXT,           -- 全域風格描述
                visual_palette TEXT,         -- 視覺色調
                aspect_ratio TEXT DEFAULT '16:9',
                duration_estimate TEXT,     -- 預估時長
                character_configs TEXT,      -- 角色設定 JSON
                status TEXT DEFAULT 'draft', -- draft, generated, used
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS mv_scenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mv_concept_id INTEGER NOT NULL,
                scene_number INTEGER NOT NULL,  -- 場景順序
                lyric_segment TEXT,              -- 對應歌詞段落
                visual_prompt TEXT NOT NULL,     -- 視覺描述 prompt
                camera_movement TEXT,            -- 鏡頭運動
                mood TEXT,                       -- 情緒氛圍
                subject TEXT,                    -- 主體描述
                background TEXT,                 -- 背景描述
                atmosphere TEXT,                 -- 氛圍描述
                character_ids TEXT,              -- 參與角色 IDs JSON
                duration_hint TEXT,              -- 時長提示
                seeddance_prompt TEXT,           -- 優化過的 SeedDance prompt
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(mv_concept_id) REFERENCES mv_concepts(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS character_portfolio (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                thumbnail_path TEXT,
                scene_type TEXT DEFAULT 'solo',       -- solo, outfit, expression, angle, action
                scene_description TEXT,               -- 場景描述
                prompt_used TEXT,                     -- 生成時使用的 prompt
                tags TEXT DEFAULT '[]',               -- 標籤: [\"室內\", \"室外\", \"暗戀\", \"工作\"]
                is_reference INTEGER DEFAULT 0,       -- 是否作為 MV 參考圖
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_portfolio_character ON character_portfolio(character_id);
            CREATE INDEX IF NOT EXISTS idx_portfolio_reference ON character_portfolio(character_id, is_reference);
        """)
    else:
        # 遷移現有表結構
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN core_features TEXT DEFAULT ''")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN anchor_features TEXT DEFAULT ''")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN default_outfit TEXT DEFAULT ''")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN outfit_options TEXT DEFAULT '[]'")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN expression_options TEXT DEFAULT '[]'")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN hairstyle TEXT DEFAULT ''")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN skin_tone TEXT DEFAULT ''")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN image_path TEXT")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN character_number TEXT")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN music_genre TEXT DEFAULT 'pop'")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN music_mood TEXT DEFAULT 'warm'")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN music_tempo TEXT DEFAULT 'medium'")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN voice_description TEXT DEFAULT ''")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN theme_tags TEXT DEFAULT '[]'")
        except:
            pass
        try:
            cursor.execute("ALTER TABLE characters ADD COLUMN gender TEXT DEFAULT 'female'")
        except:
            pass

        # 遷移 character_portfolio 表結構成 SeedDance 提示詞格式
        portfolio_migrations = [
            ("ALTER TABLE character_portfolio ADD COLUMN subject_segment TEXT DEFAULT ''"),
            ("ALTER TABLE character_portfolio ADD COLUMN setting_segment TEXT DEFAULT ''"),
            ("ALTER TABLE character_portfolio ADD COLUMN atmosphere_segment TEXT DEFAULT ''"),
            ("ALTER TABLE character_portfolio ADD COLUMN camera_segment TEXT DEFAULT ''"),
            ("ALTER TABLE character_portfolio ADD COLUMN technical_segment TEXT DEFAULT ''"),
            ("ALTER TABLE character_portfolio ADD COLUMN full_seeddance_prompt TEXT DEFAULT ''"),
            ("ALTER TABLE character_portfolio ADD COLUMN location_tags TEXT DEFAULT '[]'"),
            ("ALTER TABLE character_portfolio ADD COLUMN emotion_tags TEXT DEFAULT '[]'"),
            ("ALTER TABLE character_portfolio ADD COLUMN action_tags TEXT DEFAULT '[]'"),
            ("ALTER TABLE character_portfolio ADD COLUMN diary_context TEXT DEFAULT ''"),
            ("ALTER TABLE character_portfolio ADD COLUMN seeddance_video_url TEXT DEFAULT ''"),
        ]
        for sql in portfolio_migrations:
            try:
                cursor.execute(sql)
            except:
                pass

        # 創建 character_songs 表（如果不存在）
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS character_songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    character_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    song_path TEXT,
                    prompt TEXT,
                    genre TEXT DEFAULT '',
                    mood TEXT DEFAULT '',
                    tempo TEXT DEFAULT '',
                    duration INTEGER DEFAULT 0,
                    lyrics TEXT,
                    song_type TEXT DEFAULT 'theme',
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
                )
            """)
        except:
            pass

        # 創建 character_diaries 表（如果不存在）
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS character_diaries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    character_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    mood TEXT DEFAULT '',
                    weather TEXT DEFAULT '',
                    location TEXT DEFAULT '',
                    tags TEXT DEFAULT '[]',
                    related_character_id INTEGER,
                    is_published INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
                    FOREIGN KEY(related_character_id) REFERENCES characters(id) ON DELETE SET NULL
                )
            """)
        except:
            pass

        try:
            cursor.execute("ALTER TABLE scenes ADD COLUMN prompt_template TEXT DEFAULT ''")
        except:
            pass

        conn.commit()
        conn.close()
