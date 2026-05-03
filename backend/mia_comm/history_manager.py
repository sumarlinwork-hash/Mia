import sqlite3
import os
import json
from datetime import datetime

HISTORY_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "history")
DB_PATH = os.path.join(HISTORY_DIR, "chat_history.db")
IAM_MIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "iam_mia")
MEMORY_LOG_DIR = os.path.join(IAM_MIA_DIR, "memory")
CHAT_LOG_FILE = os.path.join(MEMORY_LOG_DIR, "chat_log.md")

class HistoryManager:
    def __init__(self):
        os.makedirs(HISTORY_DIR, exist_ok=True)
        self.init_db()

    def get_connection(self):
        # Patch C: SQLITE WAJIB NON-BLOCKING MODE
        conn = sqlite3.connect(DB_PATH, timeout=1, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def init_db(self):
        try:
            with self.get_connection() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT,
                        is_pinned INTEGER DEFAULT 0,
                        is_liked INTEGER DEFAULT 0
                    )
                """)
                conn.commit()
        except Exception as e:
            print(f"[HistoryManager] Init Failed (Skipped): {e}")

    def _sync_to_markdown(self):
        """
        SINGLE SOURCE OF TRUTH: Merubah isi chat_log.md 100% sama dengan database SQLite.
        Called automatically on every CRUD operation.
        """
        os.makedirs(MEMORY_LOG_DIR, exist_ok=True)
        try:
            with self.get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM messages ORDER BY timestamp ASC LIMIT 10000")
                rows = cursor.fetchall()

            content = ""
            for row in rows:
                timestamp = row["timestamp"]
                role = row["role"]
                msg = row["content"]
                content += f"[{timestamp}] {role}: {msg}\n"

            with open(CHAT_LOG_FILE, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            print(f"[HistoryManager] Sync to Markdown Failed: {e}")

    def add_message(self, role, content, metadata=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO messages (role, content, metadata) VALUES (?, ?, ?)",
                (role, content, json.dumps(metadata) if metadata else None)
            )
            conn.commit()
            self._sync_to_markdown()
            return cursor.lastrowid

    def get_history(self, limit=50):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM messages ORDER BY timestamp ASC LIMIT ?", (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def update_message(self, message_id, new_content):
        with self.get_connection() as conn:
            conn.execute("UPDATE messages SET content = ? WHERE id = ?", (new_content, message_id))
            conn.commit()
        self._sync_to_markdown()

    def delete_message(self, message_id):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM messages WHERE id = ?", (message_id,))
            conn.commit()
        self._sync_to_markdown()

    def set_pinned(self, message_id, pinned=True):
        with self.get_connection() as conn:
            conn.execute("UPDATE messages SET is_pinned = ? WHERE id = ?", (1 if pinned else 0, message_id))
            conn.commit()

    def set_liked(self, message_id, liked=1):
        # 1 for like, -1 for dislike, 0 for neutral
        with self.get_connection() as conn:
            conn.execute("UPDATE messages SET is_liked = ? WHERE id = ?", (liked, message_id))
            conn.commit()

    def clear_history(self):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM messages")
            conn.commit()
        self._sync_to_markdown()

history_manager = HistoryManager()
