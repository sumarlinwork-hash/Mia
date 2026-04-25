import sqlite3
import os
import json
from datetime import datetime

HISTORY_DIR = os.path.join(os.path.dirname(__file__), "history")
DB_PATH = os.path.join(HISTORY_DIR, "chat_history.db")

class HistoryManager:
    def __init__(self):
        os.makedirs(HISTORY_DIR, exist_ok=True)
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(DB_PATH)

    def init_db(self):
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

    def add_message(self, role, content, metadata=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO messages (role, content, metadata) VALUES (?, ?, ?)",
                (role, content, json.dumps(metadata) if metadata else None)
            )
            conn.commit()
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

    def delete_message(self, message_id):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM messages WHERE id = ?", (message_id,))
            conn.commit()

    def set_pinned(self, message_id, pinned=True):
        with self.get_connection() as conn:
            conn.execute("UPDATE messages SET is_pinned = ? WHERE id = ?", (1 if pinned else 0, message_id))
            conn.commit()

    def set_liked(self, message_id, liked=1):
        # 1 for like, -1 for dislike, 0 for neutral
        with self.get_connection() as conn:
            conn.execute("UPDATE messages SET is_liked = ? WHERE id = ?", (liked, message_id))
            conn.commit()

history_manager = HistoryManager()
