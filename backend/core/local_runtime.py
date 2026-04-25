import asyncio
import time
import sqlite3
import json
import os
from typing import Any, Callable, Dict, List
from .abstractions import Event, EventBus, StateStore

class LocalEventBus(EventBus):
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._queue = asyncio.Queue()
        self._running = False

    async def publish(self, event: Event):
        await self._queue.put(event)

    async def subscribe(self, event_type: str, handler: Callable):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    async def _process_events(self):
        self._running = True
        while self._running:
            event = await self._queue.get()
            handlers = self._subscribers.get(event.type, [])
            # Also support wildcard '*' subscribers
            handlers.extend(self._subscribers.get("*", []))
            
            for handler in handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    print(f"[LocalEventBus] Error in handler for {event.type}: {e}")
            
            self._queue.task_done()

    def start(self):
        asyncio.create_task(self._process_events())

    def stop(self):
        self._running = False

class LocalStateStore(StateStore):
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), "..", "data", "state.db")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT)")

    async def set_state(self, key: str, value: Any):
        serialized = json.dumps(value)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)", (key, serialized))

    async def get_state(self, key: str) -> Any:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT value FROM state WHERE key = ?", (key,)).fetchone()
            return json.loads(row[0]) if row else None

    async def delete_state(self, key: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("DELETE FROM state WHERE key = ?", (key,))

# Singleton instances for local mode
local_event_bus = LocalEventBus()
local_state_store = LocalStateStore()
