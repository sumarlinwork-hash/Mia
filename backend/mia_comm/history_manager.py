import sqlite3
import os
import json
import time
from datetime import datetime

HISTORY_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "history")
DB_PATH = os.path.join(HISTORY_DIR, "chat_history.db")
IAM_MIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "iam_mia")
MEMORY_LOG_DIR = os.path.join(IAM_MIA_DIR, "memory")
CHAT_LOG_FILE = os.path.join(MEMORY_LOG_DIR, "chat_log.md")

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
                        delay *= 2  # Exponential backoff
                    else:
                        raise e
                except Exception as e:
                    raise e
        return wrapper
    return decorator

class HistoryManager:
    def __init__(self):
        os.makedirs(HISTORY_DIR, exist_ok=True)
        self.init_db()

    def get_connection(self):
        # Patch C: SQLITE WAJIB NON-BLOCKING MODE
        conn = sqlite3.connect(DB_PATH, timeout=5.0, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        conn.execute("PRAGMA wal_autocheckpoint=1000;")
        return conn

    @retry_db_lock()
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

    @retry_db_lock()
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

    def _append_to_markdown(self, role, content, timestamp=None):
        """Hanya menambah baris baru ke file log (O(1) I/O)."""
        os.makedirs(MEMORY_LOG_DIR, exist_ok=True)
        try:
            if not timestamp:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            line = f"[{timestamp}] {role}: {content}\n"
            with open(CHAT_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line)
        except Exception as e:
            print(f"[HistoryManager] Append to Markdown Failed: {e}")

    @retry_db_lock()
    def add_message(self, role, content, metadata=None):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO messages (role, content, timestamp, metadata) VALUES (?, ?, ?, ?)",
                (role, content, timestamp, json.dumps(metadata) if metadata else None)
            )
            conn.commit()
            last_id = cursor.lastrowid
        # Hanya append, bukan full sync!
        self._append_to_markdown(role, content, timestamp)
        return last_id

    @retry_db_lock()
    def get_history(self, limit=50):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            # Ambil pesan TERBARU (DESC), lalu balikkan di memori agar urutan tampilan benar (ASC)
            cursor.execute("SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?", (limit,))
            rows = [dict(row) for row in cursor.fetchall()]
            return rows[::-1]

    @retry_db_lock()
    def update_message(self, message_id, new_content):
        with self.get_connection() as conn:
            conn.execute("UPDATE messages SET content = ? WHERE id = ?", (new_content, message_id))
            conn.commit()
        self._sync_to_markdown()

    @retry_db_lock()
    def delete_message(self, message_id):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM messages WHERE id = ?", (message_id,))
            conn.commit()
        self._sync_to_markdown()

    @retry_db_lock()
    def set_pinned(self, message_id, pinned=True):
        with self.get_connection() as conn:
            conn.execute("UPDATE messages SET is_pinned = ? WHERE id = ?", (1 if pinned else 0, message_id))
            conn.commit()

    @retry_db_lock()
    def set_liked(self, message_id, liked=1):
        # 1 for like, -1 for dislike, 0 for neutral
        with self.get_connection() as conn:
            conn.execute("UPDATE messages SET is_liked = ? WHERE id = ?", (liked, message_id))
            conn.commit()

    @retry_db_lock()
    def clear_history(self):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM messages")
            conn.commit()
        self._sync_to_markdown()

history_manager = HistoryManager()
