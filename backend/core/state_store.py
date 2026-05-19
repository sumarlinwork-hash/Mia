import os
import sys
import json
import sqlite3
import asyncio
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

