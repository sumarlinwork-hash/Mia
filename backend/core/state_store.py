import os
import sys
import json
import sqlite3
import asyncio
import time
from typing import Optional, Any
import logging

# Ensure parent directory is in sys.path for clean import of sibling modules (like config.py)
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from config import MIAConfig, get_default_config

logger = logging.getLogger("mia.state_store")

DB_DIR = os.path.join(parent_dir, "data")
DB_FILE = os.path.join(DB_DIR, "state_store.db")

class StateStore:
    """
    Transactional SQLite State Store with ACID guarantees.
    Prevents concurrent disk-write locks (PermissionError) on Windows Ivy Bridge
    by serializing database operations using an asyncio.Lock and executing sqlite3
    blocking operations in a background thread pool.
    """
    def __init__(self):
        self._lock = asyncio.Lock()
        self._initialized = False

    def _init_db(self) -> None:
        """
        Initialize the SQLite database and create config table if not exists.
        """
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_FILE)
        try:
            cursor = conn.cursor()
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS config_store (key TEXT PRIMARY KEY, value TEXT)"
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS command_runs (
                    id TEXT PRIMARY KEY,
                    command TEXT NOT NULL,
                    cwd TEXT NOT NULL,
                    status TEXT NOT NULL,
                    pid INTEGER,
                    returncode INTEGER,
                    stdout TEXT,
                    stderr TEXT,
                    created_at REAL NOT NULL,
                    started_at REAL,
                    finished_at REAL,
                    updated_at REAL NOT NULL
                )
                """
            )
            conn.commit()
        finally:
            conn.close()
        self._initialized = True
        logger.info("SQLite State Store initialized successfully.")

    async def _execute(self, query: str, params: tuple = ()) -> Any:
        """
        Safely execute a SQLite transaction inside a non-blocking background thread.
        """
        if not self._initialized:
            self._init_db()
            
        async with self._lock:
            def _run():
                conn = sqlite3.connect(DB_FILE, timeout=15.0)
                try:
                    cursor = conn.cursor()
                    cursor.execute(query, params)
                    conn.commit()
                    return cursor.fetchall()
                finally:
                    conn.close()
            return await asyncio.to_thread(_run)

    async def get_config(self) -> MIAConfig:
        """
        Retrieve the active MIAConfig from the SQLite store.
        Falls back to legacy config.json or default config if database record is missing.
        """
        rows = await self._execute("SELECT value FROM config_store WHERE key = ?", ("global_config",))
        if not rows:
            # First run migration: read from config.json if it exists
            legacy_config_file = os.path.join(parent_dir, "config.json")
            if os.path.exists(legacy_config_file):
                logger.info("Migrating legacy config.json to SQLite state store...")
                try:
                    from config import load_config
                    legacy_config = load_config(force_reload=True)
                    await self.set_config(legacy_config)
                    return legacy_config
                except Exception as e:
                    logger.error(f"Migration error: {e}. Falling back to default config.")
            
            # No legacy config, create default
            default_config = get_default_config()
            await self.set_config(default_config)
            return default_config
        
        try:
            data = json.loads(rows[0][0])
            return MIAConfig(**data)
        except Exception as e:
            logger.error(f"Error parsing config from SQLite: {e}. Falling back to default config.")
            return get_default_config()

    async def set_config(self, config: MIAConfig) -> None:
        """
        Save the new MIAConfig into the SQLite store transactionally,
        and publish a CONFIG_CHANGED event on the Event Bus.
        """
        try:
            config_json = config.model_dump_json()
        except AttributeError:
            config_json = config.json()
            
        await self._execute(
            "INSERT OR REPLACE INTO config_store (key, value) VALUES (?, ?)",
            ("global_config", config_json)
        )
        
        # Non-blocking config hot-reload alert via Event Bus
        try:
            from core.event_bus import event_bus
            await event_bus.publish("CONFIG_CHANGED", config)
        except Exception as e:
            logger.error(f"Failed to publish CONFIG_CHANGED event: {e}")

    async def upsert_command_run(self, run: dict) -> None:
        now = time.time()
        await self._execute(
            """
            INSERT INTO command_runs (
                id, command, cwd, status, pid, returncode, stdout, stderr,
                created_at, started_at, finished_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                command = excluded.command,
                cwd = excluded.cwd,
                status = excluded.status,
                pid = excluded.pid,
                returncode = excluded.returncode,
                stdout = excluded.stdout,
                stderr = excluded.stderr,
                created_at = excluded.created_at,
                started_at = excluded.started_at,
                finished_at = excluded.finished_at,
                updated_at = excluded.updated_at
            """,
            (
                run.get("id"),
                run.get("command", ""),
                run.get("cwd", ""),
                run.get("status", "unknown"),
                run.get("pid"),
                run.get("returncode"),
                run.get("stdout", ""),
                run.get("stderr", ""),
                run.get("created_at") or now,
                run.get("started_at"),
                run.get("finished_at"),
                run.get("updated_at") or now,
            ),
        )

    async def list_command_runs(self, limit: int = 20) -> list[dict]:
        safe_limit = max(1, min(limit, 100))
        rows = await self._execute(
            """
            SELECT id, command, cwd, status, pid, returncode, stdout, stderr,
                   created_at, started_at, finished_at, updated_at
            FROM command_runs
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (safe_limit,),
        )
        keys = [
            "id", "command", "cwd", "status", "pid", "returncode", "stdout", "stderr",
            "created_at", "started_at", "finished_at", "updated_at",
        ]
        return [dict(zip(keys, row)) for row in rows]

    def get_config_sync(self) -> MIAConfig:
        """
        Synchronously load config from SQLite. Thread-safe and safe to call from anywhere.
        """
        if not self._initialized:
            self._init_db()
        
        conn = sqlite3.connect(DB_FILE, timeout=15.0)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM config_store WHERE key = ?", ("global_config",))
            rows = cursor.fetchall()
        finally:
            conn.close()
            
        if not rows:
            # First run migration: read from config.json if it exists
            legacy_config_file = os.path.join(parent_dir, "config.json")
            if os.path.exists(legacy_config_file):
                logger.info("Migrating legacy config.json to SQLite state store (sync)...")
                try:
                    with open(legacy_config_file, "r") as f:
                        data = json.load(f)
                    if "appearance" not in data:
                        from config import AppearanceConfig
                        data["appearance"] = AppearanceConfig().dict()
                    # Safe normalize theme
                    from config import normalize_theme_hue
                    data["appearance"]["theme_hue"] = normalize_theme_hue(data["appearance"].get("theme_hue"))
                    
                    config = MIAConfig(**data)
                    self.set_config_sync(config)
                    return config
                except Exception as e:
                    logger.error(f"Migration error (sync): {e}. Using default config.")
            
            # No legacy config, create default
            config = get_default_config()
            self.set_config_sync(config)
            return config
            
        try:
            data = json.loads(rows[0][0])
            return MIAConfig(**data)
        except Exception as e:
            logger.error(f"Error parsing sync config from SQLite: {e}. Using default.")
            return get_default_config()

    def set_config_sync(self, config: MIAConfig) -> None:
        """
        Synchronously save config to SQLite. Thread-safe and safe to call from anywhere.
        """
        if not self._initialized:
            self._init_db()
            
        try:
            config_json = config.model_dump_json()
        except AttributeError:
            config_json = config.json()
            
        conn = sqlite3.connect(DB_FILE, timeout=15.0)
        try:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO config_store (key, value) VALUES (?, ?)",
                ("global_config", config_json)
            )
            conn.commit()
        finally:
            conn.close()
            
        # Fire-and-forget Event Bus notification if loop is running
        try:
            loop = asyncio.get_running_loop()
            if loop.is_running():
                from core.event_bus import event_bus
                loop.create_task(event_bus.publish("CONFIG_CHANGED", config))
        except RuntimeError:
            pass # No event loop running, completely fine

# Global shared instance
state_store = StateStore()
