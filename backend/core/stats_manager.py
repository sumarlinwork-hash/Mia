import json
import os
import time
import asyncio
import sqlite3
from typing import Dict, Any

class StatsManager:
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "provider_stats.db")
        self._init_db()
        self.stats = self._load_all_from_db()
        
        # Async Single Writer Queue & Task (Initialized lazily on first loop)
        self._queue = None
        self._writer_task = None
        
        # Backpressure & Duplicate Suppression State
        self._pending_flush = set()

    def _init_db(self):
        """Initialize SQLite DB, enable WAL mode, and migrate old JSON stats if present."""
        try:
            conn = sqlite3.connect(self.db_path, timeout=10.0)
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            conn.execute("""
                CREATE TABLE IF NOT EXISTS provider_stats (
                    provider_name TEXT PRIMARY KEY,
                    latency INTEGER NOT NULL,
                    health_ok INTEGER NOT NULL,
                    health_fail INTEGER NOT NULL,
                    failure_count INTEGER NOT NULL,
                    last_failure_time REAL,
                    circuit_breaker_until REAL,
                    updated_at REAL NOT NULL
                );
            """)
            conn.commit()
            conn.close()

            # Automatic One-Time Migration from old JSON stats
            old_json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "provider_stats.json")
            if os.path.exists(old_json_path):
                try:
                    with open(old_json_path, "r") as f:
                        old_stats = json.load(f)
                    
                    conn = sqlite3.connect(self.db_path, timeout=10.0)
                    cursor = conn.cursor()
                    for name, s in old_stats.items():
                        cursor.execute("""
                            INSERT OR IGNORE INTO provider_stats (
                                provider_name, latency, health_ok, health_fail, 
                                failure_count, last_failure_time, circuit_breaker_until, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            name, s.get("latency", 0), s.get("health_ok", 0), s.get("health_fail", 0),
                            s.get("failure_count", 0), s.get("last_failure_time", 0.0), 
                            s.get("circuit_breaker_until", 0.0), time.time()
                        ))
                    conn.commit()
                    conn.close()
                    
                    # Safe rename to avoid repeating migration
                    os.rename(old_json_path, old_json_path + ".bak")
                    print(f"[StatsManager] Successfully migrated {len(old_stats)} entries from JSON to SQLite (WAL mode).")
                except Exception as migration_err:
                    print(f"[StatsManager] Old JSON stats migration failed: {migration_err}")
        except Exception as db_init_err:
            print(f"[StatsManager] Database initialization failed: {db_init_err}")

    def _load_all_from_db(self) -> Dict[str, Any]:
        """Load all stats from the SQLite DB into memory."""
        stats = {}
        try:
            conn = sqlite3.connect(self.db_path, timeout=10.0)
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            cursor = conn.cursor()
            cursor.execute("""
                SELECT provider_name, latency, health_ok, health_fail, 
                       failure_count, last_failure_time, circuit_breaker_until 
                FROM provider_stats
            """)
            for row in cursor.fetchall():
                stats[row[0]] = {
                    "latency": row[1],
                    "health_ok": row[2],
                    "health_fail": row[3],
                    "failure_count": row[4],
                    "last_failure_time": row[5],
                    "circuit_breaker_until": row[6]
                }
            conn.close()
        except Exception as e:
            print(f"[StatsManager] Failed to load statistics from SQLite: {e}")
        return stats

    def _ensure_event_loop_resources(self):
        """Lazily initialize asyncio Queue and Background Writer Task on the active loop."""
        try:
            loop = asyncio.get_running_loop()
            if self._queue is None:
                self._queue = asyncio.Queue()
            if self._writer_task is None or self._writer_task.done():
                self._writer_task = loop.create_task(self._background_writer())
        except RuntimeError:
            # No running event loop yet (e.g. at initial import)
            pass

    async def _background_writer(self):
        """Single Writer Queue background worker: coalesces dirty signals and performs database transactions."""
        while True:
            try:
                # Wait for a dirty record notification
                name = await self._queue.get()
                
                # Coalesce all other pending notifications to optimize disk writes
                dirty_names = {name}
                while not self._queue.empty():
                    try:
                        dirty_names.add(self._queue.get_nowait())
                    except asyncio.QueueEmpty:
                        break
                
                # Critical: Release names from pending flush set before writing to allow re-dirtying
                self._pending_flush.difference_update(dirty_names)
                
                # Offload blocking SQLite transaction to a worker thread
                await asyncio.to_thread(self._flush_to_sqlite, dirty_names)
                
                # Resolve task counter
                for _ in range(len(dirty_names)):
                    self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                # Structured Critical Alert Log to prevent silent writer death
                print(f"[StatsManager CRITICAL ALERT] Background writer loop error: {e}. Attempting self-healing recovery...")
                await asyncio.sleep(1.0)

    def _flush_to_sqlite(self, names: set):
        """Thread-safe SQLite write transaction. Runs in dedicated thread pool."""
        try:
            conn = sqlite3.connect(self.db_path, timeout=10.0)
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            cursor = conn.cursor()
            for name in names:
                if name in self.stats:
                    s = self.stats[name]
                    cursor.execute("""
                        INSERT INTO provider_stats (
                            provider_name, latency, health_ok, health_fail, 
                            failure_count, last_failure_time, circuit_breaker_until, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(provider_name) DO UPDATE SET
                            latency=excluded.latency,
                            health_ok=excluded.health_ok,
                            health_fail=excluded.health_fail,
                            failure_count=excluded.failure_count,
                            last_failure_time=excluded.last_failure_time,
                            circuit_breaker_until=excluded.circuit_breaker_until,
                            updated_at=excluded.updated_at
                    """, (
                        name, s["latency"], s["health_ok"], s["health_fail"],
                        s["failure_count"], s["last_failure_time"], s["circuit_breaker_until"], time.time()
                    ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[StatsManager] SQLite transaction commit failed: {e}")

    def get_stats(self, provider_name: str) -> Dict[str, Any]:
        """Get statistics for a given provider, or default parameters if not found."""
        return self.stats.get(provider_name, {
            "latency": 0,
            "health_ok": 0,
            "health_fail": 0,
            "failure_count": 0,
            "last_failure_time": 0,
            "circuit_breaker_until": 0
        })

    def update_stats(self, name: str, success: bool, latency: int):
        """Synchronously mutate memory state, then dispatch dirty signal to Single Writer Queue."""
        if name not in self.stats:
            self.stats[name] = self.get_stats(name)
        
        s = self.stats[name]
        now = time.time()
        
        if success:
            s["health_ok"] += 1
            s["failure_count"] = 0
            s["circuit_breaker_until"] = 0
            # Exponential Moving Average for latency
            current_lat = s.get("latency", 0)
            s["latency"] = int((current_lat * 0.6) + (latency * 0.4)) if current_lat > 0 else latency
        else:
            s["health_fail"] += 1
            s["failure_count"] += 1
            s["last_failure_time"] = now
            s["latency"] = 9999
            
            if s["failure_count"] >= 3:
                s["circuit_breaker_until"] = now + 300 
                print(f"[StatsManager] Provider '{name}' DISABLED (Circuit Breaker active for 5 minutes)")
        
        # Enqueue update for asynchronous write (Suppresses duplicates using Backpressure Set)
        self._ensure_event_loop_resources()
        if self._queue is not None:
            if name not in self._pending_flush:
                self._pending_flush.add(name)
                self._queue.put_nowait(name)

stats_manager = StatsManager()
