import asyncio
from typing import Dict, Set, Callable, Any, Awaitable
import logging

logger = logging.getLogger("mia.event_bus")

class EventBus:
    """
    Lightweight, asynchronous, in-memory publish-subscribe Event Bus.
    Enables decoupled modules to communicate with zero network or disk overhead.
    """
    def __init__(self):
        self._subscribers: Dict[str, Set[Callable[[Any], Awaitable[None]]]] = {}

    def subscribe(self, topic: str, callback: Callable[[Any], Awaitable[None]]) -> None:
        """
        Subscribe an async callback to a topic.
        """
        if topic not in self._subscribers:
            self._subscribers[topic] = set()
        self._subscribers[topic].add(callback)
        logger.debug(f"Subscribed callback to topic: {topic}")

    def unsubscribe(self, topic: str, callback: Callable[[Any], Awaitable[None]]) -> None:
        """
        Unsubscribe a callback from a topic.
        """
        if topic in self._subscribers and callback in self._subscribers[topic]:
            self._subscribers[topic].remove(callback)
            if not self._subscribers[topic]:
                del self._subscribers[topic]
            logger.debug(f"Unsubscribed callback from topic: {topic}")

    async def publish(self, topic: str, data: Any = None) -> None:
        """
        Publish an event to all subscribers of a topic concurrently and non-blockingly.
        """
        if topic not in self._subscribers:
            return
        
        callbacks = list(self._subscribers[topic])
        tasks = []
        for callback in callbacks:
            try:
                # Wrap callback in an asyncio Task to run concurrently
                tasks.append(asyncio.create_task(callback(data)))
            except Exception as e:
                logger.error(f"Error creating task for callback on {topic}: {e}")
                
        if tasks:
            # Gather tasks and run them concurrently, logging any exceptions safely
            await asyncio.gather(*tasks, return_exceptions=True)

# Global shared instance
event_bus = EventBus()
