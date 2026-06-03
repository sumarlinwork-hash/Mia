import os
import sys
import json
import sqlite3
import time
import logging

logger = logging.getLogger("mia.creator_store")

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(parent_dir, "data")
DB_FILE = os.path.join(DB_DIR, "creator_projects.db")

def retry_db_lock(max_retries=5, initial_delay=0.05):
    def decorator(func):
        def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                        time.sleep(delay)
                        delay *= 2
                    else:
                        raise e
                except Exception as e:
                    raise e
        return wrapper
    return decorator

class CreatorStore:
    def __init__(self):
        os.makedirs(DB_DIR, exist_ok=True)
        self._init_db()

    def get_connection(self):
        conn = sqlite3.connect(DB_FILE, timeout=5.0, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        return conn

    @retry_db_lock()
    def _init_db(self):
        try:
            with self.get_connection() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS creator_projects (
                        id TEXT PRIMARY KEY,
                        name TEXT,
                        brief TEXT,
                        status TEXT,
                        assets TEXT,
                        timeline TEXT,
                        render TEXT,
                        created_at REAL,
                        updated_at REAL
                    )
                """)
                
                # Check and add new columns if they don't exist
                cursor = conn.cursor()
                cursor.execute("PRAGMA table_info(creator_projects)")
                columns = [col[1] for col in cursor.fetchall()]
                
                if "script" not in columns:
                    conn.execute("ALTER TABLE creator_projects ADD COLUMN script TEXT")
                if "subtitles" not in columns:
                    conn.execute("ALTER TABLE creator_projects ADD COLUMN subtitles TEXT")
                if "brand_kit" not in columns:
                    conn.execute("ALTER TABLE creator_projects ADD COLUMN brand_kit TEXT")
                
                conn.commit()
        except Exception as e:
            logger.error(f"[CreatorStore] Init Failed: {e}")

    def _row_to_dict(self, row: sqlite3.Row) -> dict:
        d = dict(row)
        d["assets"] = json.loads(d["assets"]) if d["assets"] else []
        d["timeline"] = json.loads(d["timeline"]) if d["timeline"] else {"tracks": []}
        d["render"] = json.loads(d["render"]) if d["render"] else {"status": "idle", "progress": 0}
        d["subtitles"] = json.loads(d.get("subtitles") or "[]")
        d["brand_kit"] = json.loads(d.get("brand_kit") or "{}")
        d["script"] = d.get("script") or ""
        return d

    @retry_db_lock()
    def get_all_projects(self):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM creator_projects ORDER BY updated_at DESC")
            return [self._row_to_dict(row) for row in cursor.fetchall()]

    @retry_db_lock()
    def get_project(self, project_id: str):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM creator_projects WHERE id = ?", (project_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row)
            return None

    @retry_db_lock()
    def save_project(self, project: dict):
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO creator_projects 
                (id, name, brief, status, assets, timeline, render, script, subtitles, brand_kit, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project.get("id"),
                    project.get("name", "Untitled Creator Project"),
                    project.get("brief", ""),
                    project.get("status", "draft"),
                    json.dumps(project.get("assets", [])),
                    json.dumps(project.get("timeline", {"tracks": []})),
                    json.dumps(project.get("render", {"status": "idle", "progress": 0})),
                    project.get("script", ""),
                    json.dumps(project.get("subtitles", [])),
                    json.dumps(project.get("brand_kit", {})),
                    project.get("created_at", time.time()),
                    project.get("updated_at", time.time())
                )
            )
            conn.commit()
        return project

    def update_project_fields(self, project_id: str, updates: dict):
        project = self.get_project(project_id)
        if not project:
            return None
        project.update(updates)
        project["updated_at"] = time.time()
        return self.save_project(project)

creator_store = CreatorStore()
